import NodeCache from 'node-cache'
import { chunk, concat } from 'lodash'
import { container } from '@onhand/common-business/lib/ioc/container'
import { TYPES } from '@onhand/common-business/lib/ioc/types'
import CACHE from '@onhand/common-business-aws/lib/consts/cache'
import {
  IInMemoryCacheService,
  IInMemoryCacheServiceToken,
} from '@onhand/common-business/lib/services/iInMemoryCacheService'
import {
  IParameterStoreService,
  IParameterStoreServiceToken,
} from '@onhand/common-business-aws/lib/services/iParameterStoreService'

type Parameters = Array<{ name: string, value: string | string[] }>

export async function initSSM (): Promise<void> {
  const parameterStoreService = container.get<IParameterStoreService>(
    IParameterStoreServiceToken,
  )
  const inMemoryCacheService = container.get<IInMemoryCacheService>(
    IInMemoryCacheServiceToken,
  )
  const cache = container.get<NodeCache>(TYPES.NodeCache)
  const fetchParams = async (): Promise<Parameters> => {
    const parameters: string[] = cache.get<string[]>(CACHE.parameterStore) ?? []
    const groups = chunk(parameters, 10)
    let result: Parameters = []
    for (const group of groups) {
      const params = await parameterStoreService.getAll(group)
      result = concat(result, params)
    }
    return result
  }
  let ssm = inMemoryCacheService.get<Parameters>('ssm')
  if (!ssm) {
    ssm = await fetchParams()
    inMemoryCacheService.set('ssm', ssm)
    for (const param of ssm) {
      container.bind(Symbol.for(param.name)).toConstantValue(param.value)
    }
  }
}
