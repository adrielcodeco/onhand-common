/* eslint-disable @typescript-eslint/no-var-requires */
import 'reflect-metadata'
import 'source-map-support/register'
import yargs from 'yargs'
import { deployCommand } from '#/commands/deploy'
import { openApiCommand } from '#/commands/openApi'
import { serveCommand } from '#/commands/serve'
import { listRulesCommand } from '#/commands/listRules'
import { seedCommand } from '#/commands/seed'
const { hideBin } = require('yargs/helpers')
const packageJson = require('../../package.json')

function main () {
  return yargs(hideBin(process.argv))
    .usage('Usage: onhand-iac-aws COMMAND')
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'config file path',
    })
    .command(
      'deploy',
      'Deploys the stack(s) into your AWS account',
      yargs => {
        yargs.positional('no-build', {
          describe: 'ignore build step',
          default: '',
        })
      },
      argv => {
        (async () => {
          await deployCommand(argv.config, { noBuild: !!argv.noBuild })
        })().catch(console.error)
      },
    )
    .command(
      'openapi [output]',
      'export the OpenAPi file',
      yargs => {
        yargs.positional('output', {
          describe: 'output path to save OpenApi file',
          default: '',
        })
      },
      argv => {
        (async () => {
          await openApiCommand(argv.config, String(argv.output))
        })().catch(console.error)
      },
    )
    .command(
      'serve',
      'execute lambda locally',
      yargs => {
        yargs.option('port', {
          describe: 'port to listen',
          default: '3000',
        })
        yargs.option('no-build', {
          describe: 'ignore build step',
          boolean: true,
          default: false,
        })
        yargs.option('watch', {
          describe: 'watch src files',
          boolean: true,
          default: true,
        })
        yargs.option('setupDB', {
          describe: 'setup db with migrations and seeds',
          boolean: true,
          default: true,
        })
      },
      argv => {
        (async () => {
          await serveCommand(argv.config, {
            port: argv.port as string,
            noBuild: !!argv.noBuild,
            watch: !!argv.watch,
            setupDB: !!argv.setupDB,
          })
        })().catch(console.error)
      },
    )
    .command(
      'list-rules',
      'list all rules',
      yargs => {
        // empty
      },
      argv => {
        (async () => {
          await listRulesCommand(argv.config)
        })().catch(console.error)
      },
    )
    .command(
      'seed',
      'execute all seed',
      yargs => {
        // empty
      },
      argv => {
        (async () => {
          await seedCommand(argv.config)
        })().catch(console.error)
      },
    )
    .version(packageJson.version)
    .demandCommand(1, '') // just print help
    .recommendCommands()
    .help()
    .alias('h', 'help').argv
}

main()