import { metrics, trace, SpanStatusCode, type Histogram, type Span, type Tracer } from '@opentelemetry/api'
import {
  logs,
  SeverityNumber,
  type Logger as OtelLogger,
  type AnyValue,
  type LogAttributes,
} from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources'
import { errWithCause } from 'pino-std-serializers'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'stubidp'

/**
 * The tracer and OTel logger used everywhere in the app. Until
 * `initNodeTelemetry()` is called (or nothing calls it at all, e.g. when this
 * package is used as a library, or deployed as a Cloudflare Worker), these
 * resolve to the no-op implementations built into @opentelemetry/api[-logs] -
 * so every call site below is safe to leave in place unconditionally, at
 * effectively zero cost when telemetry is disabled.
 *
 * Metrics instruments are deliberately NOT created eagerly like this (see
 * `lazyHistogram` below): unlike the Trace/Logs APIs, @opentelemetry/api's
 * Metrics API has no proxy/lazy-rebinding mechanism - `metrics.getMeter()`
 * permanently resolves to whatever MeterProvider is registered *at call
 * time*. Calling it at module load (before `initNodeTelemetry()` runs) would
 * bind every instrument to the no-op meter forever, silently dropping all
 * metrics even once telemetry is initialized.
 */
export const tracer: Tracer = trace.getTracer(SERVICE_NAME)
export const otelLogger: OtelLogger = logs.getLogger(SERVICE_NAME)

/**
 * Creates a histogram lazily, on first use rather than at module load - see
 * the note above on why eagerly calling `metrics.getMeter()` doesn't work.
 * By the time any instrument records its first real data point (a request or
 * operation actually happening), `initNodeTelemetry()` has already run (it's
 * called synchronously at process startup, before the server starts
 * accepting connections), so the real MeterProvider - if any - is in place.
 */
export function lazyHistogram(name: string, options: { description: string; unit: string }): () => Histogram {
  let histogram: Histogram | undefined
  return () => (histogram ??= metrics.getMeter(SERVICE_NAME).createHistogram(name, options))
}

/**
 * Records how long each `withSpan`-wrapped operation takes, tagged with the
 * span name and whether it errored - a metric for every operation we trace,
 * without instrumenting each call site separately.
 */
const getOperationDurationHistogram = lazyHistogram('app.operation.duration', {
  description: 'Duration of instrumented operations (adapter calls, interaction steps, etc.)',
  unit: 's',
})

let tracerProvider: NodeTracerProvider | undefined
let loggerProvider: LoggerProvider | undefined
let meterProvider: MeterProvider | undefined

function resource(): Resource {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    ...(process.env.npm_package_version ? { [ATTR_SERVICE_VERSION]: process.env.npm_package_version } : {}),
  })
}

/**
 * Registers OTLP/HTTP exporters for traces, logs and metrics, but only if an
 * endpoint is configured through the standard `OTEL_EXPORTER_OTLP_ENDPOINT` (or
 * its per-signal `_TRACES_`/`_LOGS_`/`_METRICS_` variants) env vars - same
 * convention every OTel SDK follows. Telemetry is opt-in, not on by default.
 *
 * Only called from the Node.js CLI entrypoint (bin/run.js). Not applicable to
 * the Cloudflare Workers deployment, which has its own native span capture
 * (see wrangler.json's `observability.traces`), and not called when this
 * package is used as a library - the host application owns its own
 * telemetry setup in that case.
 */
export function initNodeTelemetry(): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  if (!endpoint || tracerProvider) {
    return
  }

  tracerProvider = new NodeTracerProvider({
    resource: resource(),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  })
  tracerProvider.register()

  loggerProvider = new LoggerProvider({
    resource: resource(),
    processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  })
  logs.setGlobalLoggerProvider(loggerProvider)

  meterProvider = new MeterProvider({
    resource: resource(),
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
        // Unlike BatchSpanProcessor/BatchLogRecordProcessor, this reader
        // doesn't read the OTel spec's env vars for these itself.
        exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL) || 60000,
        exportTimeoutMillis: Number(process.env.OTEL_METRIC_EXPORT_TIMEOUT) || 30000,
      }),
    ],
  })
  metrics.setGlobalMeterProvider(meterProvider)
}

/**
 * Flushes buffered telemetry and shuts down the registered providers, if any.
 * Swallows failures (e.g. an unreachable OTLP collector) since a telemetry
 * backend being down should never crash the app on exit.
 */
export async function shutdownNodeTelemetry(): Promise<void> {
  for (const provider of [tracerProvider, loggerProvider, meterProvider]) {
    try {
      await provider?.shutdown()
    } catch {
      // best-effort: the collector may be unreachable, nothing more to do here
    }
  }
  tracerProvider = undefined
  loggerProvider = undefined
  meterProvider = undefined
}

/**
 * Runs `fn` inside a span named `name`: records exceptions, marks the span as
 * errored, records `app.operation.duration`, and always ends the span. Use
 * this instead of calling `tracer.startActiveSpan` directly to avoid
 * repeating that boilerplate at every call site.
 */
export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    const startedAt = performance.now()
    let error = false
    try {
      return await fn(span)
    } catch (err) {
      error = true
      span.recordException(err as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) })
      throw err
    } finally {
      getOperationDurationHistogram().record((performance.now() - startedAt) / 1000, { 'span.name': name, error })
      span.end()
    }
  })
}

const PINO_LEVEL_TO_OTEL: Record<number, { severityNumber: SeverityNumber; severityText: string }> = {
  10: { severityNumber: SeverityNumber.TRACE, severityText: 'trace' },
  20: { severityNumber: SeverityNumber.DEBUG, severityText: 'debug' },
  30: { severityNumber: SeverityNumber.INFO, severityText: 'info' },
  40: { severityNumber: SeverityNumber.WARN, severityText: 'warn' },
  50: { severityNumber: SeverityNumber.ERROR, severityText: 'error' },
  60: { severityNumber: SeverityNumber.FATAL, severityText: 'fatal' },
}

/**
 * Converts an arbitrary value into the OTel Logs API's `AnyValue` shape.
 * `Error`s get the same treatment as pino's `err` serializer (message/stack/
 * cause, since those are otherwise non-enumerable and would vanish - see
 * logger.ts), and `errWithCause`'s own `.raw` back-reference (a real Error
 * instance, not itself a valid AnyValue) is dropped. Guards against circular
 * references, since attributes here may originate from arbitrary caught
 * errors we don't control the shape of.
 */
function toAnyValue(value: unknown, seen: Set<unknown> = new Set()): AnyValue {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (value instanceof Error) {
    return toAnyValue(errWithCause(value), seen)
  }
  if (seen.has(value)) {
    return '[Circular]'
  }
  seen.add(value)
  if (Array.isArray(value)) {
    return value.map((item) => toAnyValue(item, seen))
  }
  if (typeof value === 'object') {
    const out: LogAttributes = {}
    for (const [key, val] of Object.entries(value)) {
      if (key === 'raw') continue // errWithCause's back-reference to the original (unserializable) Error
      out[key] = toAnyValue(val, seen)
    }
    return out
  }
  return String(value)
}

/**
 * Emits a pino log call as an OTel log record (a no-op until
 * `initNodeTelemetry()` registers a LoggerProvider). The OTel Logs SDK
 * automatically attaches the active span's trace/span IDs, so logs and
 * traces correlate in the backend without any extra work here.
 */
export function emitOtelLogRecord(level: number, body: string | undefined, attributes: Record<string, unknown>): void {
  const severity = PINO_LEVEL_TO_OTEL[level] ?? { severityNumber: SeverityNumber.UNSPECIFIED, severityText: undefined }
  otelLogger.emit({
    ...severity,
    body,
    attributes: toAnyValue(attributes) as LogAttributes,
  })
}
