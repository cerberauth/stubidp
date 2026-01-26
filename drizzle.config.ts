import 'dotenv/config'
import type { Config } from 'drizzle-kit'

const { DATABASE_DIALECT, DATABASE_URL } = process.env

const dialect = DATABASE_DIALECT as Config['dialect'] | undefined
if (!dialect) {
  throw new Error('DATABASE_DIALECT is not set')
}

const commonConfig: Pick<Config, 'schema' | 'dialect' | 'out'> = {
  schema: `./lib/db/schema/${dialect}.ts`,
  dialect,
  out: `./migrations/${dialect}`,
}

export default dialect === 'postgresql'
  ? {
      ...commonConfig,
      dbCredentials: {
        url: DATABASE_URL!,
      },
    }
  : {}
