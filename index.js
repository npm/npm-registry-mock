var hock = require("hock")
var predefinedMocks = require("./lib/predefines.js").predefinedMocks

module.exports = start
function start (port, cb) {
  var mocks = predefinedMocks
  if (typeof port == "function") {
    cb = port
    port = 1331
  }
  if (typeof port == "object") {
    mocks = port.mocks
    port = port.port || 1331
  }
  hock.createHock(port, function(err, hockServer) {
    for (var method in mocks) {
      for (var route in mocks[method]) {
        var status = mocks[method][route][0]
        var customTarget = mocks[method][route][1]
        var isTarball = /.tgz$/.test(route)
        if (isTarball) {
          var target = __dirname + "/fixtures/" + route;
          if (customTarget && typeof customTarget == 'string')
            target = customTarget

          hockServer[method](route).replyWithFile(status, target);
        } else {
          if (!customTarget) {
            var res = require("./fixtures/" + route)
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
    cb && cb(hockServer)
  })
}
