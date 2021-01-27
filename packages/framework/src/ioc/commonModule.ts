import NodeCache from 'node-cache'
import { ContainerModule, interfaces } from 'inversify'
import { container } from '@onhand/common-business/#/ioc/container'
import { ILogger, LogToken } from '@onhand/common-business/#/modules/logger'
import { ConsoleLogger } from '#/infrastructure/logger/consoleLogger'
import { TYPES } from '@onhand/common-business/#/ioc/types'

const commonModule = new ContainerModule(
  (bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ILogger>(LogToken).to(ConsoleLogger).inSingletonScope()
    bind<NodeCache>(TYPES.NodeCache).toConstantValue(new NodeCache())
  },
)

container.load(commonModule)

export { commonModule }
