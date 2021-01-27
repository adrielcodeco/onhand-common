import { injectable } from 'inversify'
import { transports } from 'winston'
import { LoggerClass } from './logger'

@injectable()
export class ConsoleLogger extends LoggerClass {
  constructor () {
    super([
      new transports.Console({
        handleExceptions: true,
      }),
    ])
  }
}
