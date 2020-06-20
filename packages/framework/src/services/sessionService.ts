import { injectable } from 'inversify'
// @ts-expect-error
import { createNamespace } from 'cls-hooked'
import { ISessionService } from '@onhand/common-business/lib/services/iSessionService'

export const session = createNamespace('onhand.session')

@injectable()
export class SessionService implements ISessionService {
  get<T>(key: string): T {
    return session.get(key)
  }

  set<T>(key: string, value: T): void {
    session.set(key, value)
  }
}
