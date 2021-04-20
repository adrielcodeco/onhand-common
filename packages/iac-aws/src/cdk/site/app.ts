/* eslint-disable no-new */
import * as core from '@aws-cdk/core'
import { Container } from 'typedi'
import { Options } from '#/app/options'
import {
  CloudFrontSiteStack,
  DeploySiteStack,
  S3SiteStack,
} from '#/cdk/site/stacks'

let app: core.App
let options: Options
// let promote: boolean

function initApp () {
  app = new core.App()
  Container.set('app', app)

  // promote = app.node.tryGetContext('promote')

  if (!Container.has('options')) {
    const optionsString = app.node.tryGetContext('options')
    if (optionsString) {
      options = JSON.parse(optionsString) as Options
      Container.set('options', options)
    }
  } else {
    options = Container.get<Options>('options')
  }

  if (!options) {
    throw new Error('invalid options')
  }

  options.awsAccount = app.account ?? process.env.CDK_DEFAULT_ACCOUNT
  options.awsRegion = app.region ?? process.env.CDK_DEFAULT_REGION
}

function initStacks () {
  // Assets
  new S3SiteStack(app, options)

  // cloudfront
  const cloudfront = new CloudFrontSiteStack(app, options)

  // deploy
  const deploy = new DeploySiteStack(app, options)
  deploy.addDependency(cloudfront)
}

function init () {
  try {
    initApp()
    initStacks()
    app.synth()
  } catch (err) {
    console.error(err)
  }
}

init()
