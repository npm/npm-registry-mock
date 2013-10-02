var path = require('path')

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
  hock.createHock(port, function(err, hockServer) {
    if (typeof mocks == "function") {
      mocks(hockServer)
    } else {
      mocks = extendRoutes(mocks || {})
      for (var method in mocks) {
        for (var route in mocks[method]) {
          var status = mocks[method][route][0]
          var customTarget = mocks[method][route][1]
          var isTarball = /(.tgz|.js)$/.test(route)
          if (isTarball) {
            var target = __dirname + path.sep + "fixtures" + route.replace(/\//g, path.sep);
            if (customTarget && typeof customTarget == 'string')
              target = customTarget

            hockServer[method](route).replyWithFile(status, target);
          } else {
            if (!customTarget) {
              var res = require(__dirname + path.sep + "fixtures" + route.replace(/\//g, path.sep))
              res = JSON.stringify(res).replace(/http:\/\/registry\.npmjs\.org/ig, 'http://localhost:' + port)
            }
            else {
              try {
                var res = require(customTarget)
              } catch (e) {
                var res = customTarget
              }
            }
            hockServer[method](route).reply(status, res)
          }
        }
      }
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