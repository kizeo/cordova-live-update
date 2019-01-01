#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _commander = _interopRequireDefault(require("commander"));

var _express = _interopRequireDefault(require("express"));

var _findUp = _interopRequireDefault(require("find-up"));

var _path = _interopRequireDefault(require("path"));

var _watch = _interopRequireDefault(require("watch"));

var _lodash = _interopRequireDefault(require("lodash"));

var _child_process = require("child_process");

var _glob = _interopRequireDefault(require("glob"));

var _archiver = _interopRequireDefault(require("archiver"));

var _fs = _interopRequireDefault(require("fs"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _os = _interopRequireDefault(require("os"));

function simpleWriteFileSync(filePath, content) {
  var options = {
    encoding: 'utf-8',
    flag: 'w'
  };

  _fs.default.writeFileSync(filePath, content, options);
}

function simpleReadFileSync(filePath) {
  return _fs.default.readFileSync(filePath, 'utf8');
}

;
(0, _asyncToGenerator2.default)(
/*#__PURE__*/
_regenerator.default.mark(function _callee3() {
  var rootConfig, ROOT, externalIp, ifaces, dev, iface, build, buildWatch;
  return _regenerator.default.wrap(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          buildWatch = function _ref5(watchRoot, buildDirectory, liveInfo) {
            console.log("Liveupdate bundler monitoring ".concat(watchRoot, " for changes"));
            var buildFilePath = "".concat(watchRoot, "/liveupdate.js");

            _watch.default.watchTree(watchRoot, {
              filter: function filter(f) {
                return f !== buildFilePath && f.match(/hot-update/) === null;
              }
            }, _lodash.default.debounce(function (f, curr, prev) {
              build(buildFilePath, buildDirectory, liveInfo);
            }, 1000));
          };

          build = function _ref4(buildFilePath, buildDirectory, liveInfo) {
            var finalInfo = (0, _objectSpread2.default)({
              currentBuildId: new Date().getTime()
            }, liveInfo);
            var finalInfoSerialized = JSON.stringify(finalInfo, null, 2);
            var lib = simpleReadFileSync(_path.default.join(__dirname, './LiveUpdate.js'));
            var buildInfo = "\n    ".concat(lib, "\n    LiveUpdater.buildManifest = ").concat(finalInfoSerialized, ";\n    document.addEventListener(\"deviceready\", (()=> {\n      const liveUpdater = LiveUpdater(LiveUpdater.buildManifest);\n      liveUpdater.checkRepeatedly();\n    }), false)\n    ");
            console.log("Running 'cordova prepare'");
            var prepare = (0, _child_process.exec)('cordova prepare', {
              cwd: ROOT
            }, function (err, stdout, stderr) {
              if (err) {
                console.log(err);
              }

              console.log(stdout);
            });
            prepare.on('exit', function (code) {
              console.log('Finding platforms');
              (0, _glob.default)("".concat(ROOT, "/platforms/*/www"), {
                cwd: ROOT
              }, function (er, files) {
                _lodash.default.each(files, function (platformRoot) {
                  var matches = platformRoot.match(/\/platforms\/(.*?)\/www/);
                  var platformName = matches[1];
                  var archiveRoot = "".concat(buildDirectory, "/").concat(platformName);
                  console.log("Bundling ".concat(platformName));

                  _mkdirp.default.sync(archiveRoot);

                  var outputName = "".concat(archiveRoot, "/").concat(finalInfo.currentBuildId, ".zip");
                  console.log("Writing ".concat(outputName));

                  var output = _fs.default.createWriteStream(outputName);

                  var archive = (0, _archiver.default)('zip', {
                    zlib: {
                      level: 9
                    } // Sets the compression level.

                  });
                  output.on('close', function () {
                    console.log(archive.pointer() + ' total bytes');
                    console.log("Writing LiveInfo client bootstrap:\n".concat(finalInfoSerialized));
                    simpleWriteFileSync(buildFilePath, buildInfo);
                    console.log('Writing LiveInfo server meta');
                    simpleWriteFileSync("".concat(buildDirectory, "/liveupdate.json"), finalInfoSerialized);
                  });
                  output.on('end', function () {
                    console.log('Data has been drained');
                  });
                  archive.on('warning', function (err) {
                    console.log('warning', err);
                  });
                  archive.on('error', function (err) {
                    throw err;
                  });
                  archive.pipe(output);
                  archive.directory(platformRoot + '/', false);
                  archive.finalize();
                });
              });
            });
          };

          _context3.next = 4;
          return (0, _findUp.default)('config.xml');

        case 4:
          rootConfig = _context3.sent;

          if (rootConfig) {
            _context3.next = 7;
            break;
          }

          throw new Error('liveupdate must be run from inside a Cordova application root.');

        case 7:
          ROOT = _path.default.dirname(rootConfig);
          console.log("Cordova root is ".concat(ROOT));
          externalIp = null;
          ifaces = _os.default.networkInterfaces();

          for (dev in ifaces) {
            iface = ifaces[dev].filter(function (details) {
              return details.family === 'IPv4' && details.internal === false;
            });
            if (iface.length > 0) externalIp = iface[0].address;
          }

          console.log("External IP looks like: ".concat(externalIp));

          _commander.default.command('serve').option('-h, --host [host]', 'Host [0.0.0.0]', null).option('-p, --port [port]', 'Port [4000]', '4000').option('-w, --watch [directory]', 'Directory to watch for changes [www]', _path.default.join(ROOT, 'www')).option('-d, --directory [directory]', 'Target bundle directory (webroot) [<project root>/liveupdate]', _path.default.join(ROOT, 'liveupdate')).action(
          /*#__PURE__*/
          function () {
            var _ref2 = (0, _asyncToGenerator2.default)(
            /*#__PURE__*/
            _regenerator.default.mark(function _callee(cmd) {
              var host, port, updateUrl, app;
              return _regenerator.default.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      host = cmd.host || '0.0.0.0';
                      port = cmd.port;
                      updateUrl = "http://".concat(cmd.host || externalIp, ":").concat(port);

                      _express.default.static.mime.define({
                        'application/json': ['json'],
                        'application/zip': ['zip']
                      });

                      app = (0, _express.default)();
                      app.use(_express.default.static(cmd.directory));
                      app.listen(port, host);
                      app.get('/', function (req, res) {
                        res.setHeader('Content-Type', 'application/json');
                        res.send(simpleReadFileSync("".concat(cmd.directory, "/liveinfo.json")));
                      });
                      buildWatch(cmd.watch, cmd.directory, {
                        updateUrl: updateUrl
                      });
                      console.log("Listening on http://".concat(host, ":").concat(port, " from ").concat(cmd.directory));

                    case 10:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee, this);
            }));

            return function (_x) {
              return _ref2.apply(this, arguments);
            };
          }());

          _commander.default.command('bundle').option('-w, --watch [directory]', 'Watch for changes and re-bundle', _path.default.join(ROOT, 'www')).option('-d, --directory [directory]', 'Target bundle directory [<project root>/liveupdate]', _path.default.join(ROOT, 'liveupdate')).option('-u, --updateurl [url]', 'The production LiveUpdate URL/endpoint', null).action(
          /*#__PURE__*/
          function () {
            var _ref3 = (0, _asyncToGenerator2.default)(
            /*#__PURE__*/
            _regenerator.default.mark(function _callee2(cmd) {
              return _regenerator.default.wrap(function _callee2$(_context2) {
                while (1) {
                  switch (_context2.prev = _context2.next) {
                    case 0:
                      if (!~cmd.updateurl) {
                        _context2.next = 2;
                        break;
                      }

                      throw new Error('You must provide an Update URL endpoint when bundling.');

                    case 2:
                      if (cmd.watch) {
                        buildWatch(cmd.watch, cmd.directory);
                      }

                    case 3:
                    case "end":
                      return _context2.stop();
                  }
                }
              }, _callee2, this);
            }));

            return function (_x2) {
              return _ref3.apply(this, arguments);
            };
          }());

          _commander.default.parse(process.argv);

        case 16:
        case "end":
          return _context3.stop();
      }
    }
  }, _callee3, this);
}))();
