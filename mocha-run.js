#!/usr/bin/env node
// ---------------------------------------------------------------------------------------------------------------------
// This script is intended to execute all system tests.
// ---------------------------------------------------------------------------------------------------------------------

const Mocha = require('mocha')
// const path = require('path')
const glob = require('glob')

const mocha = new Mocha({ timeout: 1000 * 99999 * 1000, color: true })

// test/**/*.js --grep ^Crawler test after transfer file to my baidu pan update postpan baidu pan info$

const files = glob.sync('./test/**/*.js')
// const files = glob.sync('./test/crawlerapi-test.js')

// mocha.addFile(filePath)
files.forEach(fs => {
  mocha.addFile(fs)
})

mocha.grep(/\[debug\]/i)
// mocha.grep(/^baidu helper test$/i)
// start the mocha run
mocha.run((runError) => {
  if (runError) {
    console.error(runError.stack || runError)
  }
})
