import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { loadConfig } from '#/app/loadConfig'
import { serve } from '#/app/serve'

export async function serveCommand (
  configPath?: string,
  serverOptions?: {
    port: string
    noBuild: boolean
    watch: boolean
    setupDB: boolean
  },
) {
  const options = loadConfig({}, configPath)
  if (serverOptions?.setupDB) {
    const childProcess: ChildProcess = spawn(
      'node',
      [
        path.resolve(__dirname, '../../bin/iac'),
        'seed',
        ...(configPath ? ['--config', configPath] : []),
      ],
      {
        cwd: process.cwd(),
      },
    )
    const code = await new Promise(resolve => {
      childProcess.on('exit', resolve)
    })
    if (code) {
      throw new Error(`seed command exited with ${String(code)} code`)
    }
  }
  await serve(options, serverOptions)
}
