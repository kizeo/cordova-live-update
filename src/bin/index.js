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

function simpleFileWriteSync(filePath, content) {
  var options = { encoding: 'utf-8', flag: 'w' }

  fs.writeFileSync(filePath, content, options)

  console.log('Write file data complete.')
}

let liveInfo = {
  build: 0,
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

  function build(buildFilePath, buildDirectory) {
    liveInfo.build = new Date().getTime()
    const buildInfo = `const LIVEUPDATE=${JSON.stringify(liveInfo)};`
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
          const outputName = `${archiveRoot}/${liveInfo.build}.zip`
          console.log(`Writing ${outputName}`)
          var output = fs.createWriteStream(outputName)
          var archive = archiver('zip', {
            zlib: { level: 9 }, // Sets the compression level.
          })
          output.on('close', function() {
            console.log(archive.pointer() + ' total bytes')
            console.log(`Writing new buildInfo to source: ${buildInfo}`)
            simpleFileWriteSync(buildFilePath, buildInfo)
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

  function buildWatch(watchRoot, buildDirectory) {
    console.log(`Liveupdate bundler monitoring ${watchRoot} for changes`)
    const buildFilePath = `${watchRoot}/liveupdate.js`
    watch.watchTree(
      watchRoot,
      {
        filter: f => f !== buildFilePath && f.match(/hot-update/) === null,
      },
      _.debounce((f, curr, prev) => {
        build(buildFilePath, buildDirectory)
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
        res.send(JSON.stringify(liveInfo))
      })

      buildWatch(cmd.watch, cmd.directory)
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
    .action(async cmd => {
      if (cmd.watch) {
        buildWatch(cmd.watch, cmd.directory)
      }
    })

  program.parse(process.argv)
})()
