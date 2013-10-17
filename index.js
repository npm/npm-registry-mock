var path = require("path")
var fs = require("fs")

var hock = require("hock")
var extend = require("util-extend")

var predefinedMocks = require("./lib/predefines.js").predefinedMocks

module.exports = start
function start (port, cb) {
  var mocks = {}
  if (typeof port == "function") {
    cb = port
    port = 1331
  }
  if (typeof port == "object") {
    mocks = port.mocks || mocks
    port = port.port || 1331
  }
  hock.createHock(port, function (err, hockServer) {
    if (typeof mocks == "function") {
      mocks(hockServer)
    } else {
      mocks = extendRoutes(mocks || {})
      Object.keys(mocks).forEach(function (method) {
        Object.keys(mocks[method]).forEach(function (route) {
          var status = mocks[method][route][0]
          var customTarget = mocks[method][route][1]
          var target

          if (customTarget && typeof customTarget === "string")
            target = customTarget
          else
            target = __dirname + path.sep + "fixtures" + route.replace(/\//g, path.sep)
          fs.lstat(target, function (err, stats) {
            if (err) return next()
            if (stats.isDirectory()) return next()
            return hockServer[method](route).replyWithFile(status, target)
          })

          function next() {
            var res
            if (!customTarget) {
              res = require(__dirname + path.sep + "fixtures" + route.replace(/\//g, path.sep))
              res = JSON.stringify(res).replace(/http:\/\/registry\.npmjs\.org/ig, 'http://localhost:' + port)

              return hockServer[method](route).reply(status, res)
            }

            try {
              res = require(customTarget)
            } catch (e) {
              res = customTarget
            }
            hockServer[method](route).reply(status, res)
          }
        })
      })

    }
    cb && cb(hockServer)
  })
}

function extendRoutes(mocks) {
  for (var method in mocks) {
    predefinedMocks[method] = extend(predefinedMocks[method], mocks[method])

  }
  return predefinedMocks
}