export const ISessionServiceToken = Symbol.for('ISessionService')

export interface ISessionService {
  get: <T>(key: string) => T
  set: <T>(key: string, value: T) => void
}
