import QuickLRU from 'quick-lru'

type Payload = Record<string, unknown>

const storage = new QuickLRU<string, unknown>({ maxSize: 1000 })

const grantable = new Set([
  'AccessToken',
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
])

function grantKeyFor(id: string) {
  return `grant:${id}`
}

function sessionUidKeyFor(id: string) {
  return `uid:${id}`
}

function userCodeKeyFor(userCode: string) {
  return `userCode:${userCode}`
}

export class MemoryAdapter {
  constructor(private model: string) {}

  key(id: string) {
    return `${this.model}:${id}`
  }

  async destroy(id: string): Promise<void> {
    storage.delete(this.key(id))
  }

  async consume(id: string): Promise<void> {
    const record = storage.get(this.key(id)) as Payload
    record.consumed = Math.floor(Date.now() / 1000)
  }

  async find(id: string): Promise<Payload | undefined> {
    return storage.get(this.key(id)) as Payload | undefined
  }

  async findByUid(uid: string): Promise<Payload | undefined> {
    return this.find(storage.get(sessionUidKeyFor(uid)) as string)
  }

  async findByUserCode(userCode: string): Promise<Payload | undefined> {
    return this.find(storage.get(userCodeKeyFor(userCode)) as string)
  }

  async upsert(id: string, payload: Payload, expiresIn: number): Promise<void> {
    const key = this.key(id)
    const maxAge = expiresIn * 1000

    if (this.model === 'Session') {
      storage.set(sessionUidKeyFor(payload.uid as string), id, { maxAge })
    }

    const { grantId, userCode } = payload

    if (grantable.has(this.model) && grantId) {
      const grantKey = grantKeyFor(grantId as string)
      const grant = (storage.get(grantKey) as string[] | undefined) ?? []
      grant.push(key)
      storage.set(grantKey, grant)
    }

    if (userCode) {
      storage.set(userCodeKeyFor(userCode as string), id, { maxAge })
    }

    storage.set(key, payload, { maxAge })
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    const grantKey = grantKeyFor(grantId)
    const grant = storage.get(grantKey) as string[] | undefined
    if (grant) {
      grant.forEach((token) => storage.delete(token))
      storage.delete(grantKey)
    }
  }
}
