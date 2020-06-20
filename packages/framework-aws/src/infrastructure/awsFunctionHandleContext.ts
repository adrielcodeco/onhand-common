import { inject, injectable } from 'inversify'
import { get } from 'lodash'
import { container } from '@onhand/common-business/lib/ioc/container'
import { ILogger, LogToken } from '@onhand/common-business/lib/modules/logger'
import { TYPES } from '@onhand/common-business/lib/ioc/types'
import {
  AWSFunctionHandleContextOptions,
  AWSFunctionHandleContextOptionsToken,
} from '#/infrastructure/awsFunctionHandleContextOptions'
import {
  ISessionService,
  ISessionServiceToken,
} from '@onhand/common-business/lib/services/iSessionService'
import { initSSM } from '#/infrastructure/initSSM'
import { HttpErrors } from '@onhand/common-framework/lib/errors'

@injectable()
export abstract class AWSFunctionHandleContext<E> {
  @inject(LogToken)
  private readonly logger!: ILogger

  @inject(AWSFunctionHandleContextOptionsToken)
  readonly options!: AWSFunctionHandleContextOptions

  async init (event: E): Promise<void> {
    this.logger.info('initializing containerContext', this.options)
    await this.initFeatureFlags(event)
    await this.initAuthenticatedUser(event)
    await this.ensureSSM()
  }

  async initFeatureFlags (event: E): Promise<void> {
    // nothing
  }

  async initAuthenticatedUser (event: E): Promise<void> {
    if (!event) {
      return
    }
    const externalIdentifier = get(
      event,
      'requestContext.authorizer.externalIdentifier',
    )

    const logger = container.get<ILogger>(LogToken)
    logger.info(`externalIdentifier: ${String(externalIdentifier)}`)

    if (externalIdentifier) {
      const session = container.get<ISessionService>(ISessionServiceToken)
      session.set(
        TYPES.ExternalIdentifier.toString(),
        parseInt(externalIdentifier, 10),
      )
    } else if (this.options.authenticated) {
      throw HttpErrors.HRC401
    }
  }

  async ensureSSM (): Promise<void> {
    if (this.options.initSSM) {
      await initSSM()
    }
  }
}
