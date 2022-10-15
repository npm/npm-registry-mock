var path = require('path')
var fs = require('fs')
var url = require('url')

var hock = require('hock')
var extend = require('util-extend')

var predefinedMocks = require('./lib/predefines.js').predefinedMocks

module.exports = start
function start (options, cb) {
  var minReq = options.minReq === undefined ? 0 : options.minReq
  var maxReq = options.maxReq === undefined ? Infinity : options.maxReq
  var port = options.port === undefined ? 1331 : options.port
  var mocks = options.mocks === undefined ? {} : options.mocks
  var plugin = options.plugin === undefined ? function () {} : options.plugin
  if (options.port === 0) {
    options.port = '0'
  } // work around hock 0.x stripping the port arg if false

  var hockServer = hock.createHock(options, function (err) {
    hockServer._server.removeListener('error', cb)
    if (err) {
      return cb(err)
    }
    var realUrl = 'http://localhost:' + hockServer.address().port

    mocks = extendRoutes(mocks)

    // default headers must be set before invoking plugins so that
    // newly-enqueued requests inherit those default headers
    hockServer.defaultReplyHeaders({ connection: 'close' })
    plugin(hockServer)

    Object.keys(mocks).forEach(function (method) {
      Object.keys(mocks[method]).forEach(function (route) {
        var status = mocks[method][route][0]
        var customTarget = mocks[method][route][1]
        var target

        if (customTarget && typeof customTarget === 'string') {
          target = customTarget
        } else {
          target = __dirname + '/fixtures' + route
        }
        fs.lstat(target, function (err, stats) {
          if (err) {
            return next()
          }
          if (stats.isDirectory()) {
            return next()
          }
          return hockServer[method](route)
            .many({ max: maxReq, min: minReq })
            .replyWithFile(status, target)
        })

        function replaceRegistry (res) {
          return JSON.stringify(res)
            .replace(/https?:\/\/registry\.npmjs\.org/ig, realUrl)
        }

        function next () {
          var res
          if (!customTarget) {
            res = require(__dirname + '/fixtures' + route)
            res = replaceRegistry(res)

            var escapeScoped = route.replace(/^(\/@[^\/]+)\//, '$1%2f')
            if (escapeScoped !== route) {
              hockServer[method](escapeScoped)
                .many({ max: maxReq, min: minReq })
                .reply(status, res)
            }

            return hockServer[method](route)
              .many({ max: maxReq, min: minReq })
              .reply(status, res)
          }

          try {
            res = require(customTarget)
          } catch (e) {
            res = customTarget
          }

          res = replaceRegistry(res)
          hockServer[method](route)
            .many({ max: maxReq, min: minReq })
            .reply(status, res)
        }
      })
    })
    cb && cb(null, hockServer)
  })
  hockServer._server.once('error', cb)
}

function extendRoutes (mocks) {
  for (var method in mocks) {
    predefinedMocks[method] = extend(predefinedMocks[method], mocks[method])
  }
  return predefinedMocks
}
