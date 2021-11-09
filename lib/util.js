'use strict'

const execa = require('execa')
const util = require('util')
const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')

exports.logFile = function logFile (filePath, data) {
  fs.appendFileSync(path.join(__dirname, '../logs/', filePath), data + '\n\r')
}
/**
 * 时间格式化
 * @param {string | number | Date | Dayjs | null | undefined} date 时间类型
 * @returns {String}
 */
function dateFormat (date, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(date).format(format)
}
exports.dateFormat = dateFormat

/**
 * delay thread
 * @param {number} ms
 * @returns
 */
exports.sleep = async function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
exports.getRandomRange = async function (min, max) {
  return Math.random() * (max - min) + min
}

exports.sh = function (prog, args, cb) {
  util.callbackify(() => execa(prog, args))(cb)
}

exports.dusm = function (path, cb) {
  exports.sh('du', ['-sm', path], (err, res) => {
    if (err) return cb(err)

    if (res.stderr.length > 0) {
      return cb(new Error(`du -sm: ${res.stderr}`))
    }

    const m = /^([0-9]+)\t/.exec(res.stdout)
    if (m === null) {
      console.log(res.stdout)
      return cb(new Error('du -sm: Unknown error'))
    }

    return cb(null, parseInt(m[1], 10))
  })
}

exports.tiffutil = function (a, b, out, cb) {
  exports.sh('tiffutil', ['-cathidpicheck', a, b, '-out', out], (err) => cb(err))
}

exports.codesign = function (identity, identifier, path, cb) {
  const args = ['--verbose', '--sign', identity]
  if (identifier) {
    args.push('--identifier', identifier)
  }
  args.push(path)
  exports.sh('codesign', args, (err) => cb(err))
}
