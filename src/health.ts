import type { Request, Response } from 'express'

import type { DatabaseInstance } from './db/db.js'

export async function pingDb(db: DatabaseInstance): Promise<void> {
  const { sql } = await import('drizzle-orm')
  if (typeof db.run === 'function') {
    await db.run(sql`SELECT 1`)
  } else {
    await db.execute(sql`SELECT 1`)
  }
}

export function livenessHandler(_req: Request, res: Response): void {
  res.json({ status: 'ok' })
}

export function readinessHandler(checks: Record<string, () => Promise<void>>) {
  return async (_req: Request, res: Response): Promise<void> => {
    const results: Record<string, { status: 'ok' | 'error'; error?: string }> = {}

    for (const [name, check] of Object.entries(checks)) {
      try {
        await check()
        results[name] = { status: 'ok' }
      } catch (e) {
        results[name] = { status: 'error', error: String(e) }
      }
    }

    const healthy = Object.values(results).every((c) => c.status === 'ok')
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'error', checks: results })
  }
}
