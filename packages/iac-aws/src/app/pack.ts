import fs from 'fs'
import fsExtra from 'fs-extra'
import path from 'path'
import archiver from 'archiver'
import { Options } from './options'

export async function pack (options: Options) {
  return new Promise((resolve, reject) => {
    let ended = false
    const end = (err?: any) => {
      if (ended) return
      ended = true
      !err ? resolve('') : reject(err)
    }
    fsExtra.ensureDirSync(path.resolve(options.cwd, options.buildFolder))
    const bundle = fs.createWriteStream(
      path.resolve(options.cwd, options.buildFolder, 'package.zip'),
    )
    const archive = archiver('zip', {
      zlib: { level: 9 },
    })

    bundle.on('close', function () {
      console.log(`${archive.pointer()} total bytes`)
      console.log(
        'archiver has been finalized and the output file descriptor has closed.',
      )
      end()
    })

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    bundle.on('end', function () {
      console.log('Data has been drained')
    })

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        // log warning
      } else {
        // throw error
        throw err
      }
    })

    // good practice to catch this error explicitly
    archive.on('error', function (err) {
      end(err)
      throw err
    })

    // pipe archive data to the file
    archive.pipe(bundle)

    for (const file of options.buildFiles) {
      // append files from a glob pattern
      archive.glob(file)
    }

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    archive.finalize().catch(() => {})
  })
}
