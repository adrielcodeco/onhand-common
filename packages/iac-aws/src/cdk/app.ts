/* eslint-disable no-new */
import * as core from '@aws-cdk/core'
import { Container } from 'typedi'
import { S3AssetsStack } from '#/cdk/stacks/s3-assets-stack'
// import { CognitoStack } from '#/cdk/stacks/cognito-stack'
import { FunctionsStack } from '#/cdk/stacks/functions-stack'
import { ApiGatewayStack } from '#/cdk/stacks/apigateway-stack'
import { Options } from '#/app/options'
import { extractOpenAPISpecification } from '@onhand/openapi/#/extractOpenApiSpecification'

export function buildApp () {
  const app = new core.App()
  Container.set('app', app)

  let options: Options | undefined
  if (!Container.has('options')) {
    const optionsString = app.node.tryGetContext('options')
    if (optionsString) {
      options = JSON.parse(optionsString) as Options
      Container.set('options', options)
    }
  } else {
    options = Container.get<Options>('options')
  }

  if (options) {
    if (!options.openApiFilePath) {
      throw new Error('OpenAPI class not found')
    }
    const openapi = extractOpenAPISpecification(options.openApiFilePath)
    Container.set('openapi', openapi)
  }

  if (!options) {
    throw new Error('invalid options')
  }

  // Assets
  new S3AssetsStack(app, options.appName)

  // Cognito
  // const cognitoStack = new CognitoStack(app, options.appName, options.stage)

  // Functions
  new FunctionsStack(app, options.appName, options.stage)

  // ApiGateway
  /* const apiGatewayStack = */ new ApiGatewayStack(app, options.appName)
  // apiGatewayStack.addDependency(cognitoStack)

  app.synth()
}
