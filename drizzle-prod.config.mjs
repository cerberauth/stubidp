const { STUBIDP_DATABASE_DIALECT, STUBIDP_DATABASE_URL } = process.env

const dialect = STUBIDP_DATABASE_DIALECT
if (!dialect) {
  throw new Error('STUBIDP_DATABASE_DIALECT is not set')
}

const commonConfig = {
  dialect,
  out: `./migrations/${dialect}`,
}

export default dialect === 'postgresql'
  ? {
      ...commonConfig,
      dbCredentials: {
        url: STUBIDP_DATABASE_URL,
      },
    }
  : {}
