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
var port = 1331
var address = "http://localhost:" + port
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
    mr(port, function (s) {
      var client = new RC(conf)
      client.get("/underscore", function (er, data, raw, res) {
        assert.equal(data._id, "underscore")
        s.close()
        done(er)
      })
    })
  })
  it("responds to latest", function (done) {
    mr(port, function (s) {
      var client = new RC(conf)
      client.get("/underscore/latest", function (er, data, raw, res) {
        assert.equal(data._id, "underscore@1.5.1")
        s.close()
        done(er)
      })
    })
  })
})

describe("registry mocking - npm.install", function () {
  var path = tempdir + "/node_modules/underscore/package.json"

  it("sends the module as tarball (version specified)", function (done) {
    mr(port, function (s) {
      npm.load({registry: address}, function () {
        npm.commands.install(tempdir, "underscore@1.3.1", function (err) {
          require.cache[path] = null
          var version = require(path).version
          assert.equal(version, "1.3.1")
          s.close()
          done()
        })
      })
    })
  })
  it("sends the module as tarball (no version specified -- latest)", function (done) {
    mr(port, function (s) {
      npm.load({registry: address}, function () {
        npm.commands.install(tempdir, "underscore", function (err) {
          require.cache[path] = null
          var version = require(path).version
          assert.equal(version, "1.5.1")
          s.close()
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
        "/ente200": [200, {ente200: "true"}],
        "/ente400": [400, {ente400: "true"}],
        "/async/-/async-0.1.0.tgz": [200, __dirname + "/fixtures/async/-/async-0.1.0.tgz"],
        "/async/0.1.0": [200, __dirname + "/fixtures/async/0.1.0"],
      }
    }
    mr({port: 1331, mocks: customMocks}, function (s) {
      request(address + "/ente200", function (er, res) {
        assert.deepEqual(res.body, JSON.stringify({ente200: "true"}))
        assert.equal(res.statusCode, 200)
        request(address + "/ente400", function (er, res) {
          assert.equal(res.body, JSON.stringify({ente400: "true"}))
          assert.equal(res.statusCode, 400)
          npm.load({registry: address}, function () {
            npm.commands.install(tempdir, "async@0.1.0", function (err) {
              var exists = fs.existsSync(tempdir + "/node_modules/async/package.json")
              assert.ok(exists)
              s.close()
              done()
            })
          })
        })
      })
    })
  })
})