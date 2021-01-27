import 'reflect-metadata'

const symbolOnhandAPIFunctionMetadata = Symbol.for(
  'onhand-api-function-metadata',
)

type FunctionMetadata = {
  functionFileAbsolutePath: string
  provider: string
  className: string
  handlerName: string
}

export function manageFunctionMetadata (func: any) {
  const metadata: FunctionMetadata = Reflect.getMetadata(
    symbolOnhandAPIFunctionMetadata,
    func,
  )
  const _ = {
    get: (): FunctionMetadata => {
      return metadata
    },
    set: (metadata: FunctionMetadata) => {
      Reflect.defineMetadata(symbolOnhandAPIFunctionMetadata, metadata, func)
      return _
    },
    change: (change: (metadata: FunctionMetadata) => FunctionMetadata) => {
      Reflect.defineMetadata(
        symbolOnhandAPIFunctionMetadata,
        change(metadata),
        func,
      )
      return _
    },
    changeKey: <
      P extends keyof FunctionMetadata,
      T extends FunctionMetadata[P]
    >(
      key: P,
      value: T,
    ) => {
      if (!metadata) {
        throw new Error('metadata not exits')
      }
      metadata[key] = value
      Reflect.defineMetadata(symbolOnhandAPIFunctionMetadata, metadata, func)
      return _
    },
    delete: <P extends keyof FunctionMetadata>(key: P) => {
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
