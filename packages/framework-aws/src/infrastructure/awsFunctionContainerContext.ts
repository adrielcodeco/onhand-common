import { injectable, inject } from 'inversify'
import axios from 'axios'
import { ILogger, LogToken } from '@onhand/common-business/lib/modules/logger'
import { container } from '@onhand/common-business/lib/ioc/container'
import { TYPES } from '@onhand/common-business/lib/ioc/types'
import {
  AWSFunctionContainerContextOptions,
  AWSFunctionContainerContextOptionsToken,
} from '#/infrastructure/awsFunctionContainerContextOptions'
import { interceptors } from '@onhand/common-framework/lib/infrastructure/axiosInterceptors'
import { initSSM } from '#/infrastructure/initSSM'

@injectable()
export abstract class AWSFunctionContainerContext {
  @inject(LogToken)
  private readonly logger!: ILogger

  @inject(AWSFunctionContainerContextOptionsToken)
  readonly options!: AWSFunctionContainerContextOptions

  async init (): Promise<void> {
    this.logger.info('initializing containerContext', this.options)
    await this.initSSM()
    await this.initLogger()
    await this.initConfig()
  }

  async initSSM (): Promise<void> {
    if (!this.options.initSSM) {
      return
    }
    await initSSM()
  }

  async initLogger (): Promise<void> {
    if (!this.options.initLogger) {
      return
    }
    interceptors()
  }

  async initConfig (): Promise<void> {
    const globalRequestTimeout = container.get<string>(
      TYPES.GlobalRequestTimeout,
    )
    axios.defaults.timeout = parseInt(
      globalRequestTimeout ?? this.options.initLogger ?? String(1000 * 10),
      10,
    )
  }
}
