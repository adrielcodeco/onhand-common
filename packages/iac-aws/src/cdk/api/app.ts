/* eslint-disable no-new */
import * as core from '@aws-cdk/core'
import { Container } from 'typedi'
import path from 'path'
import { Options } from '#/app/options'
import { getConfigOrDefault } from '#/app/config'
import { extractOpenAPISpecification } from '@onhand/openapi/#/extractOpenApiSpecification'
import {
  ApiGatewayStack,
  CloudFrontStack,
  // CognitoStack,
  DeployStack,
  // FlagrStack,
  FunctionsStack,
  S3Stack,
} from '#/cdk/api/stacks'

let app: core.App
let options: Options
let promote: boolean

function initApp () {
  app = new core.App()
  Container.set('app', app)

  promote = app.node.tryGetContext('promote')
  console.log(promote)

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
    const openApiFilePath = getConfigOrDefault(
      options.config,
      c => c.app?.openApi,
    )
    if (!openApiFilePath) {
      throw new Error('OpenAPI class not found')
    }
    const openapi = extractOpenAPISpecification(
      path.resolve(options.cwd, openApiFilePath),
    )
    Container.set('openapi', openapi)
  }

  if (!options) {
    throw new Error('invalid options')
  }
}

function initStacks () {
  // Assets
  new S3Stack(app, options)

  // Cognito
  // const cognitoStack = new CognitoStack(app, options.appName, options.stage)

  let functionsStack
  if (!promote) {
    // Functions
    functionsStack = new FunctionsStack(app, options)
  }

  // ApiGateway
  const apiGatewayStack = new ApiGatewayStack(app, options)
  if (functionsStack) {
    apiGatewayStack.addDependency(functionsStack)
  }
  // apiGatewayStack.addDependency(cognitoStack)

  // cloudfront
  const cloudfront = new CloudFrontStack(app, options)
  cloudfront.addDependency(apiGatewayStack)

  // deploy
  const deploy = new DeployStack(app, options)
  deploy.addDependency(cloudfront)
}

function init () {
  initApp()
  initStacks()
  app.synth()
}

init()
