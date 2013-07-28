var assert = require("assert")
var mr = require("../index.js")

// clients
var request = require("request")
var RC = require("npm-registry-client")
var npm = require("npm")

// misc test helper
var mkdir = require("mkdirp")
var rimraf = require("rimraf")
var fs = require("fs")

// test-settings
var tempdir = __dirname + "/out"

// config
var address = "http://localhost:1331"
var real = "http://registry.npmjs.org"
var conf = {
    cache: tempdir
  , registry: address }


beforeEach(function (done) {
  rimraf.sync(tempdir)
  mkdir.sync(tempdir)
  done()
})
afterEach(function (done) {
  rimraf.sync(tempdir)
  done()
})


describe("registry mocking - RegistryClient", function () {
  it("returns the underscore json", function (done) {
    mr(address, function () {
      var client = new RC(conf)
      client.get("/underscore", function (er, data, raw, res) {
        assert.equal(data._id, "underscore")
        done(er)
      })
    })
  })
})

describe("registry mocking - npm.install", function () {
  var path = tempdir + "/node_modules/underscore/package.json"

  it("sends the module as tarball (version specified)", function (done) {
    mr(address, function () {
      npm.load({registry: address}, function () {
        npm.commands.install(tempdir, "underscore@1.3.1", function (err) {
          require.cache[path] = null
          var version = require(path).version
          assert.equal(version, "1.3.1")
          done()
        })
      })
    })
  })
  it("sends the module as tarball (no version specified -- latest)", function (done) {
    mr(address, function () {
      npm.load({registry: address}, function () {
        npm.commands.install(tempdir, "underscore", function (err) {
          require.cache[path] = null
          var version = require(path).version
          assert.equal(version, "1.5.1")
          done()
        })
      })
    })
  })
})

describe("replacing the predefined mocks with custom ones", function () {
  it("handles new mocks", function (done) {
    var customMocks = {
      "get": {
        "/ente200": [200, function handler (uri, requestBody) { return {"ente200": "true" } }],
        "/ente400": [400, function handler (uri, requestBody) { return {"ente400": "true"} }]
      }
    }
    mr({url: address, mocks: customMocks}, function () {
      request(address + "/ente200", function (er, res) {
        assert.deepEqual(res.body, JSON.stringify({ente200: "true"}))
        assert.equal(res.statusCode, 200)
        request(address + "/ente400", function (er, res) {
          assert.equal(res.body, JSON.stringify({ente400: "true"}))
          assert.equal(res.statusCode, 400)
          done(er)
        })
      })
    })
  })
})