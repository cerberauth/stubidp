import 'dotenv/config'
import type { Config } from 'drizzle-kit'

const { STUBIDP_DATABASE_DIALECT, STUBIDP_DATABASE_URL } = process.env

const dialect = STUBIDP_DATABASE_DIALECT as Config['dialect'] | undefined
if (!dialect) {
  throw new Error('STUBIDP_DATABASE_DIALECT is not set')
}

const commonConfig: Pick<Config, 'schema' | 'dialect' | 'out'> = {
  schema: `./src/db/schema/${dialect}.ts`,
  dialect,
  out: `./migrations/${dialect}`,
}

export default dialect === 'postgresql'
  ? {
      ...commonConfig,
      dbCredentials: {
        url: STUBIDP_DATABASE_URL!,
      },
    }
  : commonConfig
