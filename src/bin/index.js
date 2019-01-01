#!/usr/bin/env node
import program from 'commander'
import express from 'express'
import findUp from 'find-up'
import path from 'path'
import watch from 'watch'
import _ from 'lodash'
import { exec } from 'child_process'
import glob from 'glob'
import archiver from 'archiver'
import fs from 'fs'
import mkdirp from 'mkdirp'
import os from 'os'

function simpleWriteFileSync(filePath, content) {
  var options = { encoding: 'utf-8', flag: 'w' }
  fs.writeFileSync(filePath, content, options)
}

function simpleReadFileSync(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

;(async function() {
  const rootConfig = await findUp('config.xml')
  if (!rootConfig) {
    throw new Error(
      'liveupdate must be run from inside a Cordova application root.',
    )
  }
  const ROOT = path.dirname(rootConfig)
  console.log(`Cordova root is ${ROOT}`)

  let ip = null
  let ifaces = os.networkInterfaces()
  for (let dev in ifaces) {
    const iface = ifaces[dev].filter(function(details) {
      return details.family === 'IPv4' && details.internal === false
    })
    if (iface.length > 0) ip = iface[0].address
  }
  console.log(`External IP looks like: ${ip}`)

  function build(buildFilePath, buildDirectory, liveInfo) {
    const finalInfo = {
      currentBuildId: new Date().getTime(),
      ...liveInfo,
    }
    const finalInfoSerialized = JSON.stringify(finalInfo, null, 2)
    const lib = simpleReadFileSync(path.join(__dirname, './LiveUpdate.js'))
    const buildInfo = `
    ${lib}
    document.addEventListener("deviceready", (()=> {
      LiveUpdate.startLiveUpdating(${finalInfoSerialized})
    }), false)
    `
    console.log(`Running 'cordova prepare'`)
    const prepare = exec('cordova prepare', { cwd: ROOT }, function(
      err,
      stdout,
      stderr,
    ) {
      if (err) {
        console.log(err)
      }
      console.log(stdout)
    })

    prepare.on('exit', function(code) {
      console.log('Finding platforms')
      glob(`${ROOT}/platforms/*/www`, { cwd: ROOT }, (er, files) => {
        _.each(files, platformRoot => {
          const matches = platformRoot.match(/\/platforms\/(.*?)\/www/)
          const platformName = matches[1]
          const archiveRoot = `${buildDirectory}/${platformName}`
          console.log(`Bundling ${platformName}`)
          mkdirp.sync(archiveRoot)
          const outputName = `${archiveRoot}/${finalInfo.currentBuildId}.zip`
          console.log(`Writing ${outputName}`)
          var output = fs.createWriteStream(outputName)
          var archive = archiver('zip', {
            zlib: { level: 9 }, // Sets the compression level.
          })
          output.on('close', function() {
            console.log(archive.pointer() + ' total bytes')
            console.log(
              `Writing LiveInfo client bootstrap:\n${finalInfoSerialized}`,
            )
            simpleWriteFileSync(buildFilePath, buildInfo)
            console.log('Writing LiveInfo server meta')
            simpleWriteFileSync(
              `${buildDirectory}/liveinfo.json`,
              finalInfoSerialized,
            )
          })
          output.on('end', function() {
            console.log('Data has been drained')
          })
          archive.on('warning', function(err) {
            console.log('warning', err)
          })
          archive.on('error', function(err) {
            throw err
          })
          archive.pipe(output)
          archive.directory(platformRoot + '/', false)
          archive.finalize()
        })
      })
    })
  }

  function buildWatch(watchRoot, buildDirectory, liveInfo) {
    console.log(`Liveupdate bundler monitoring ${watchRoot} for changes`)
    const buildFilePath = `${watchRoot}/liveupdate.js`
    watch.watchTree(
      watchRoot,
      {
        filter: f => f !== buildFilePath && f.match(/hot-update/) === null,
      },
      _.debounce((f, curr, prev) => {
        build(buildFilePath, buildDirectory, liveInfo)
      }, 1000),
    )
  }

  program
    .command('serve')
    .option('-h, --host [host]', 'Host [0.0.0.0]', '0.0.0.0')
    .option('-p, --port [port]', 'Port [4000]', '4000')
    .option(
      '-w, --watch [directory]',
      'Directory to watch for changes [www]',
      path.join(ROOT, 'www'),
    )
    .option(
      '-d, --directory [directory]',
      'Target bundle directory (webroot) [<project root>/liveupdate]',
      path.join(ROOT, 'liveupdate'),
    )
    .option(
      '-e, --external [url]',
      'The external URL of this dev server [http://{$ip}:4000]',
      null,
    )
    .action(async cmd => {
      express.static.mime.define({
        'application/json': ['json'],
        'application/zip': ['zip'],
      })
      const app = express()
      app.use(express.static(cmd.directory))
      app.listen(cmd.port, cmd.host)
      app.get('/', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.send(simpleReadFileSync(`${cmd.directory}/liveinfo.json`))
      })
      let updateUrl = cmd.external
      if (~updateUrl) {
        updateUrl = `http://${ip}:${cmd.port}`
      }
      buildWatch(cmd.watch, cmd.directory, {
        updateUrl,
        recheckTimeoutMs: 500,
      })
      console.log(
        `Serving http://${cmd.host}:${cmd.port} from ${cmd.directory}`,
      )
    })

  program
    .command('bundle')
    .option(
      '-w, --watch [directory]',
      'Watch for changes and re-bundle',
      path.join(ROOT, 'www'),
    )
    .option(
      '-d, --directory [directory]',
      'Target bundle directory [<project root>/liveupdate]',
      path.join(ROOT, 'liveupdate'),
    )
    .option(
      '-u, --updateurl [url]',
      'The production LiveUpdate URL/endpoint',
      null,
    )

    .action(async cmd => {
      if (~cmd.updateurl) {
        throw new Error(
          'You must provide an Update URL endpoint when bundling.',
        )
      }
      if (cmd.watch) {
        buildWatch(cmd.watch, cmd.directory)
      }
    })

  program.parse(process.argv)
})()
