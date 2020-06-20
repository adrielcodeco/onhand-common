import { EOL } from 'os'
import { isEmpty } from 'lodash'
import { inspect } from 'util'
import { injectable } from 'inversify'
import { ILogger } from '@onhand/common-business/lib/modules/logger'
import { createLogger, Logger, transports, format } from 'winston'

@injectable()
export class ConsoleLogger implements ILogger {
  private readonly logger!: Logger

  constructor () {
    const { combine, metadata, printf } = format
    this.logger = createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      format: combine(
        metadata(),
        printf(info => {
          let result = `${info.level}: `
          // tslint:disable-next-line: strict-type-predicates
          if (typeof info.message === 'string') {
            result += info.message
          } else {
            result += inspect(info.message, false, 5)
          }
          if (!isEmpty(info.metadata)) {
            result += EOL
            if (typeof info.metadata === 'string') {
              result += info.metadata
            } else {
              result += inspect(info.metadata, false, 5)
            }
          }
          return result
        }),
      ),
      transports: [
        new transports.Console({
          handleExceptions: true,
        }),
      ],
      exitOnError: false,
    })
  }

  public log (log: any, context?: any, level?: string): void {
    const func = Reflect.get(this.logger, level ?? 'info') as (
      log: any,
      context?: any,
    ) => void
    func(log, context)
  }

  public debug (log: any, context?: any): void {
    this.logger.debug(log, context)
  }

  public info (log: any, context?: any): void {
    this.logger.info(log, context)
  }

  public notice (log: any, context?: any): void {
    this.logger.notice(log, context)
  }

  public warning (log: any, context?: any): void {
    this.logger.warn(log, context)
  }

  public error (log: any, context?: any): void {
    this.logger.error(log, context)
  }

  public crit (log: any, context?: any): void {
    this.logger.crit(log, context)
  }

  public alert (log: any, context?: any): void {
    this.logger.alert(log, context)
  }

  public emerg (log: any, context?: any): void {
    this.logger.emerg(log, context)
  }
}
