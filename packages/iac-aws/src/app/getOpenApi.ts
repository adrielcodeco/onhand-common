import { transform } from 'lodash'
import { extractOpenAPISpecification } from '@onhand/openapi/#/extractOpenApiSpecification'

export function getOpenAPI (openApiPath: string): string {
  if (!openApiPath) {
    throw new Error('OpenApi class file not found')
  }
  const openApi = extractOpenAPISpecification(openApiPath)
  return JSON.stringify(notUndefinedDeep(openApi), null, 1)
}

function notUndefinedDeep (obj: any) {
  const processArray = (array: any[]): any[] => {
    const result = []
    for (const item of array) {
      result.push(notUndefinedDeep(item))
    }
    return result
  }
  const processObj = (item: any) => {
    return transform(
      item,
      (result: any, value: any, key: any) => {
        if (value === undefined) {
          return
        }
        if (typeof value === 'object' && value) {
          if (Array.isArray(value)) {
            result[key] = processArray(value)
          } else {
            result[key] = notUndefinedDeep(value)
          }
          return
        }
        result[key] = value
      },
      {},
    )
  }
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return processArray(obj)
    } else {
      return processObj(obj)
    }
  } else {
    return obj
  }
}
