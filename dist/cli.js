#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

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

function simpleFileWriteSync(filePath, content) {
  var options = {
    encoding: 'utf-8',
    flag: 'w'
  };

  _fs.default.writeFileSync(filePath, content, options);

  console.log('Write file data complete.');
}

var liveInfo = {
  build: 0
};
(0, _asyncToGenerator2.default)(
/*#__PURE__*/
_regenerator.default.mark(function _callee3() {
  var rootConfig, ROOT, build, buildWatch;
  return _regenerator.default.wrap(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          buildWatch = function _ref5(watchRoot, buildDirectory) {
            console.log("Liveupdate bundler monitoring ".concat(watchRoot, " for changes"));
            var buildFilePath = "".concat(watchRoot, "/liveupdate.js");

            _watch.default.watchTree(watchRoot, {
              filter: function filter(f) {
                return f !== buildFilePath && f.match(/hot-update/) === null;
              }
            }, _lodash.default.debounce(function (f, curr, prev) {
              build(buildFilePath, buildDirectory);
            }, 1000));
          };

          build = function _ref4(buildFilePath, buildDirectory) {
            liveInfo.build = new Date().getTime();
            var buildInfo = "const LIVEUPDATE=".concat(JSON.stringify(liveInfo), ";");
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

                  var outputName = "".concat(archiveRoot, "/").concat(liveInfo.build, ".zip");
                  console.log("Writing ".concat(outputName));

                  var output = _fs.default.createWriteStream(outputName);

                  var archive = (0, _archiver.default)('zip', {
                    zlib: {
                      level: 9
                    } // Sets the compression level.

                  });
                  output.on('close', function () {
                    console.log(archive.pointer() + ' total bytes');
                    console.log("Writing new buildInfo to source: ".concat(buildInfo));
                    simpleFileWriteSync(buildFilePath, buildInfo);
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

          _commander.default.command('serve').option('-h, --host [host]', 'Host [0.0.0.0]', '0.0.0.0').option('-p, --port [port]', 'Port [4000]', '4000').option('-w, --watch [directory]', 'Directory to watch for changes [www]', _path.default.join(ROOT, 'www')).option('-d, --directory [directory]', 'Target bundle directory (webroot) [<project root>/liveupdate]', _path.default.join(ROOT, 'liveupdate')).action(
          /*#__PURE__*/
          function () {
            var _ref2 = (0, _asyncToGenerator2.default)(
            /*#__PURE__*/
            _regenerator.default.mark(function _callee(cmd) {
              var app;
              return _regenerator.default.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      _express.default.static.mime.define({
                        'application/json': ['json'],
                        'application/zip': ['zip']
                      });

                      app = (0, _express.default)();
                      app.use(_express.default.static(cmd.directory));
                      app.listen(cmd.port, cmd.host);
                      app.get('/', function (req, res) {
                        res.setHeader('Content-Type', 'application/json');
                        res.send(JSON.stringify(liveInfo));
                      });
                      buildWatch(cmd.watch, cmd.directory);
                      console.log("Serving http://".concat(cmd.host, ":").concat(cmd.port, " from ").concat(cmd.directory));

                    case 7:
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

          _commander.default.command('bundle').option('-w, --watch [directory]', 'Watch for changes and re-bundle', _path.default.join(ROOT, 'www')).option('-d, --directory [directory]', 'Target bundle directory [<project root>/liveupdate]', _path.default.join(ROOT, 'liveupdate')).action(
          /*#__PURE__*/
          function () {
            var _ref3 = (0, _asyncToGenerator2.default)(
            /*#__PURE__*/
            _regenerator.default.mark(function _callee2(cmd) {
              return _regenerator.default.wrap(function _callee2$(_context2) {
                while (1) {
                  switch (_context2.prev = _context2.next) {
                    case 0:
                      if (cmd.watch) {
                        buildWatch(cmd.watch, cmd.directory);
                      }

                    case 1:
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

        case 12:
        case "end":
          return _context3.stop();
      }
    }
  }, _callee3, this);
}))();
