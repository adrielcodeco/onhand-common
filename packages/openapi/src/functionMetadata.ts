import 'reflect-metadata'

const symbolOnhandAPIFunctionMetadata = Symbol.for(
  'onhand-api-function-metadata',
)

export type FunctionMetadata = {
  functionFileAbsolutePath: string
  provider: string
  className: string
  handlerName: string
}

export function manageFunctionMetadata<FM extends FunctionMetadata> (func: any) {
  const metadata: FM = Reflect.getMetadata(
    symbolOnhandAPIFunctionMetadata,
    func,
  )
  const _ = {
    get: (): FM => {
      return metadata
    },
    set: (metadata: FM) => {
      Reflect.defineMetadata(symbolOnhandAPIFunctionMetadata, metadata, func)
      return _
    },
    change: (change: (metadata: FM) => FM) => {
      Reflect.defineMetadata(
        symbolOnhandAPIFunctionMetadata,
        change(metadata),
        func,
      )
      return _
    },
    changeKey: <P extends keyof FM, T extends FM[P]>(key: P, value: T) => {
      if (!metadata) {
        throw new Error('metadata not exits')
      }
      metadata[key] = value
      Reflect.defineMetadata(symbolOnhandAPIFunctionMetadata, metadata, func)
      return _
    },
    delete: <P extends keyof FM>(key: P) => {
      if (!metadata) {
        throw new Error('metadata not exits')
      }
      Reflect.deleteProperty(metadata, key)
      Reflect.defineMetadata(symbolOnhandAPIFunctionMetadata, metadata, func)
      return _
    },
    end: () => func,
  }
  return _
}
