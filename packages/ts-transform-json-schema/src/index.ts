import 'reflect-metadata'
import { Definition } from 'typescript-json-schema'

export { Definition }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function definitionOf<T> (instance?: T): Definition | null {
  throw new Error('definitionOf should not be used at runtime')
}

type Constructor<T> = { new (...args: any[]): T }

const definitionMetadataKey = Symbol.for('onhand-type-definition-metadata')

export function DefinitionMetadata () {
  // eslint-disable-next-line prefer-rest-params
  const definition = arguments?.length ? arguments[0] : null
  return (constructor: Constructor<any>) => {
    if (definition) {
      Reflect.defineMetadata(definitionMetadataKey, definition, constructor)
    }
    return constructor
  }
}
