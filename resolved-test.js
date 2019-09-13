const assert = require('assert')
const { readFileSync } = require('fs')
const { exec } = require('child_process')
const path = require('path')
const tempdir = require('tempdir')
const rimraf = require('rimraf')
var mr = require('./index.js')

const testFolder = path.join(__dirname, 'resolved-test')

rimraf.sync(path.join(testFolder, 'node_modules'))

mr({port: 1331}, function (err, s) {
  exec(`npm install --cache ${tempdir.sync()} --registry http://localhost:1331 --no-audit`, { cwd: testFolder, env: process.env }, (err, stdout) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    assert.equal(readFileSync(path.join(testFolder, 'node_modules/underscore/underscore.js')).toString().slice(0, 10), '//MODIFIED')
    }
    s.close()
  })
})
