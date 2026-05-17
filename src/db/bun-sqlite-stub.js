export class Database {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_path) {
    throw new Error('bun:sqlite is not available in this environment')
  }
}
