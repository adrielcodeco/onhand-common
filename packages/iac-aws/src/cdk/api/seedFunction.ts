import path from 'path'
import glob from 'glob'
import { seedFiles } from '#/app/seed'
// @ts-expect-error
import { config } from 'seeds/config'

export default async function () {
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
