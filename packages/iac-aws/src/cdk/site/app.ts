/* eslint-disable no-new */
import * as core from '@aws-cdk/core'
import { Container } from 'typedi'
import { Options } from '#/app/options'
import {
  CloudFrontSiteStack,
  DeploySiteStack,
  S3SiteStack,
} from '#/cdk/site/stacks'

const app = new core.App()
Container.set('app', app)

// const promote = app.node.tryGetContext('promote')

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

if (!options) {
  throw new Error('invalid options')
}

// Assets
new S3SiteStack(app, options)

// cloudfront
const cloudfront = new CloudFrontSiteStack(app, options)

// deploy
const deploy = new DeploySiteStack(app, options)
deploy.addDependency(cloudfront)

app.synth()
