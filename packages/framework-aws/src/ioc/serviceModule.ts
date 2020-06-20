import { ContainerModule, interfaces } from 'inversify'
import { container } from '@onhand/common-business/lib/ioc/container'
import {
  IParameterStoreService,
  IParameterStoreServiceToken,
} from '@onhand/common-business-aws/lib/services/iParameterStoreService'
import { ParameterStoreService } from '#/services/parameterStoreService'

const serviceModule = new ContainerModule(
  (bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IParameterStoreService>(IParameterStoreServiceToken)
      .to(ParameterStoreService)
      .inSingletonScope()
  },
)

container.load(serviceModule)

export { serviceModule }
