const { DATABASE_DIALECT, DATABASE_URL } = process.env

const dialect = DATABASE_DIALECT
if (!dialect) {
  throw new Error('DATABASE_DIALECT is not set')
}

const commonConfig = {
  dialect,
  out: `./migrations/${dialect}`,
}

export default dialect === 'postgresql'
  ? {
      ...commonConfig,
      dbCredentials: {
        url: DATABASE_URL,
      },
    }
  : {}
