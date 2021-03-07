import path from 'path'
import glob from 'glob'
import { seedFiles } from '#/app/seed'
// @ts-expect-error
import { config } from 'seeds/config'

async function seed () {
  try {
    const files = glob
      .sync('seeds-*.js', { cwd: __dirname, nodir: true })
      .map(file => path.resolve(__dirname, file))
    await seedFiles(files, config)
  } catch (err) {
    console.error(err)
    throw err
  }
}

export default async function (event: any) {
  try {
    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        await seed()
        break
      case 'Delete':
      default:
        console.log('does nothing on ', event.RequestType)
        break
    }
  } catch (err) {
    console.error(err)
    throw err
  }
}
