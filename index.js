var nock = require("nock")
var predefinedMocks = require("./lib/predefines.js").predefinedMocks

module.exports = start
function start (url, cb) {
  var mocks = predefinedMocks
  if (typeof url == "function") {
    cb = url
    url = "http://localhost:1331/"
  }
  if (typeof url == "object") {
    mocks = url.mocks
    url = url.url || "http://localhost:1331/"
  }

  for (var method in mocks) {
    for (var route in mocks[method]) {
      var status = mocks[method][route][0]
      var handler = mocks[method][route][1]
      var isTarball = /.tgz$/.test(route)
      if (isTarball) {
        nock(url)[method](route).replyWithFile(status, __dirname + "/fixtures/" + route);
      } else if (handler) {
        nock(url)[method](route).reply(status, handler)
      } else {
        var res = require("./fixtures/" + route)
        nock(url)[method](route).reply(status, res)
      }
    }
  }
  cb && cb()
}
