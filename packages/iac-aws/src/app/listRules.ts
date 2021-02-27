import { OpenAPIV3 } from 'openapi-types'
import { isHttpMethod, extractOpenAPISpecification } from '@onhand/openapi'
import { Options } from '#/app/options'
import { getConfigOrDefault } from '#/app/config'

export async function listRules (options: Options) {
  const paths: Array<{ path: string, rules: any[] }> = []
  const openApiFilePath = getConfigOrDefault(
    options.config,
    c => c.app?.openApi,
  )
  const openApi = extractOpenAPISpecification(openApiFilePath ?? '')
  for (const routePath in openApi.paths) {
    if (!Object.prototype.hasOwnProperty.call(openApi.paths, routePath)) {
      continue
    }
    const path: { path: string, rules: any[] } = { path: routePath, rules: [] }
    paths.push(path)
    const pathItemObject: OpenAPIV3.PathItemObject = openApi.paths[routePath]!
    for (const method in pathItemObject) {
      if (!Object.prototype.hasOwnProperty.call(pathItemObject, method)) {
        continue
      }
      if (!isHttpMethod(method)) {
        continue
      }
      const operation: OpenAPIV3.OperationObject = pathItemObject[method]!
      const { security } = operation
      for (const sec in security) {
        const grants = Reflect.get(security, sec)
        for (const grant of grants) {
          const [
            effect,
            action,
            possession,
            resource,
            ...attributes
          ] = grant.split(':')
          path.rules.push({
            effect,
            action,
            resource,
            possession,
            attributes: attributes.length ? attributes : ['*'],
          })
        }
      }
    }
  }
  for (const { path, rules } of paths) {
    console.log(path)
    for (const rule of rules) {
      console.log(`  ${JSON.stringify(rule)}`)
    }
  }
}
