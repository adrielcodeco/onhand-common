import 'reflect-metadata'
import { ApiGatewayFunction } from '#/infrastructure/apigateway/apigatewayFunction'
import { session } from '@onhand/common-framework/#/services/sessionService'

const symbolOnhandHandlerMetadata = Symbol.for('onhand-handler-metadata')

type FunctionClassType = {
  new (...args: any[]): ApiGatewayFunction
}

export function apiGatewayHandler (
  FunctionClass: FunctionClassType,
): (event: any) => any {
  const lambda = new FunctionClass()
  const containerContext = lambda.init()
  const handler = async (event: any) => {
    return new Promise((resolve, reject) => {
      session.run(() => {
        (async () => {
          await containerContext
          return lambda.handle(event)
        })()
          .then(resolve)
          .catch(reject)
      })
    })
  }
  const handlerMetadata = {
    provider: 'AWS',
    className: FunctionClass.name,
  }
  Reflect.defineMetadata(symbolOnhandHandlerMetadata, handlerMetadata, handler)
  return handler
}
