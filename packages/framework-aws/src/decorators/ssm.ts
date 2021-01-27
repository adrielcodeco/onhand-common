import NodeCache from 'node-cache'
import { TYPES } from '@onhand/common-business/#/ioc/types'
import { container } from '@onhand/common-business/#/ioc/container'

type Constructor<T> = { new (...args: any[]): T }
const cacheKeySSM = 'CACHE_KEY_SSM'

export function SSM (
  ...params: string[]
): (constructor: Constructor<any>) => void {
  return (constructor: Constructor<any>) => {
    const nodeCache = container.get<NodeCache>(TYPES.NodeCache)
    if (!nodeCache.has(cacheKeySSM)) {
      nodeCache.set(cacheKeySSM, [])
    }
    const ssm = nodeCache.get<string[]>(cacheKeySSM)!
    params.forEach(p => ssm.push(p))
  }
}
