/* eslint-disable @typescript-eslint/no-var-requires */
import path from 'path'
import glob from 'glob'
import { Options } from '#/app/options'
import { TimelineModelProvider } from '#/app/db/timeline'

export async function seed (options: Options) {
  let seedsPath = options.config?.db?.seeds
  if (!seedsPath) {
    return
  }
  let configPath = options.config?.db?.config
  if (!configPath) {
    return
  }
  if (!path.isAbsolute(configPath)) {
    configPath = path.resolve(options.cwd, configPath)
  }
  const { config } = require(configPath)
  console.log('onHand - loading config')
  await config()
  const TimelineModel = TimelineModelProvider()
  if (!path.isAbsolute(seedsPath)) {
    seedsPath = path.resolve(options.cwd, seedsPath)
  }
  const seeds = await TimelineModel.scan('type').eq('seed').exec()
  const files = glob.sync('**/*.ts', { cwd: seedsPath })
  const allSeeds = Array.from(seeds.values()).map(s => s.name)
  console.log(
    `onHand - ${allSeeds.length} seed${allSeeds.length > 1 ? 's' : ''} found`,
  )
  console.log(
    `onHand - ${files.length} seed${files.length > 1 ? 's' : ''} in folder`,
  )
  for (const file of files.sort()) {
    const absoluteFilePath = path.resolve(seedsPath, file)
    const fileName = path.basename(absoluteFilePath)
    const exists = allSeeds.find(s => s === fileName)
    if (exists) {
      console.log(`onHand - OLD ${fileName}`)
      continue
    }
    const { sow } = require(absoluteFilePath)
    await sow()
    await TimelineModel.create({
      id: `seed#${fileName}`,
      name: fileName,
      type: 'seed',
    })
    console.log(`onHand - NEW ${fileName}`)
  }
}
