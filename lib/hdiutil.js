const execa = require('execa')
const { sleep } = require('./util')
// var shelljs = require( 'shelljs' )
const path = require('path')
const { result } = require('lodash')
const cp = require('child_process')
const spawn = cp.spawn

exports.attach = async function (dmgPath, password = '') {
  // echo -n "xxmac.com" | hdiutil attach -nobrowse -noverify -noautoopen /Volumes/iDisk/xxmac/xxmac/111634474710578_snapmotion-for-mac-/SnapMotion_4.3.2.dmg

  try {
    // let res = execa.commandSync(`hdiutil attach ${path} -nobrowse -noverify -noautoopen`,{ detached: true,stdio:'inherit', windowsHide: true })
    // const res=shelljs.exec(`echo -n "xxmac.com" | hdiutil attach -stdinpass -nobrowse -noverify -noautoopen ${path} `, {shell: '/bin/bash',stdio:'inherit',windowsHide: true})
    // const res=shelljs.exec(`hdiutil attach -nobrowse -noverify -noautoopen ${path} `, {shell: '/bin/bash',stdio:'inherit',windowsHide: true})

    // console.log('执行attach')
    const msg = ''
    const result = {
      inputPath: dmgPath,
      success: false,
      msg: null,
      outPath: null
    }
    const args = [
      dmgPath,
      password
    ]
    const res = await execa(`${path.join(__dirname, '../shell/auto_install.sh')}`, args)
    // res = shelljs.exec('echo $SHELL')
    if (res.stdout.includes('attach failed')) {
      result.msg = '密码验证错误'
      return result
    }
    const m = /Apple_HFS\s+(.*)\s*$/.exec(res.stdout)
    if (m === null) {
      result.msg = 'Failed to mount image'
      return result
      // return new Error('Failed to mount image,stderr'+res.stderr)
    }
    result.success = true
    result.msg = 'mount success'
    result.outPath = m[1]
    return result
  } catch (error) {
    result.success = false
    result.msg = error.message
    return result
  }
}

/**
 *
 * @param {String} path
 * @returns {String} message
 - success:
    return ""
 - fail:
    return "error message"
 */
exports.detach = async function (path) {
  const args = [
    'detach', path
    // '-force',
    // '-quiet'
  ]

  let attempts = 0

  const result = {
    msg: '',
    success: false
  }
  // retry 5 times
  while (attempts < 5) {
    try {
      const res = await execa('hdiutil', args)
      // console.log('执行detach')
      // console.log(res)
      // result =true
      result.success = true
      result.msg = 'unmount success'
      break
    } catch (err) {
      result.msg = err.message
      if (err && (err.exitCode === 16 || err.code === 16) && attempts < 5) {
        await sleep(1000 * Math.pow(2, attempts - 1))
      } else {
        // console.error(err)

        result.msg = err.message
        // throw err
      }
    }
    attempts++
  }
  return result
}

//
// defaults read /Volumes/package-file/Adobe\ Zii\ 2022.app/Contents/Info CFBundleShortVersionString
exports.getAppVersion = async function (appPath) {
  const args = [
    'read',
    path.join(appPath, '/Contents/Info'),
    'CFBundleShortVersionString'
  ]
  try {
    const ret = await execa('defaults', args)
    if (ret.stderr) {
      return {
        success: false,
        data: ret.stderr
      }
    }
    return {
      success: true,
      data: ret.stdout
    }
  } catch (err) {
    return {
      success: false,
      data: '',
      msg: err.message
    }
  }
}
/**
 *
 * @param {String} configName
 * @param {String} dir
 * @returns {Object}
 {
    success: false,
    data: ret.stderr
 }
 */
exports.packageByDropDmg = async function (configName, sourceDir) {
// dropdmg -g drop /Users/apple/Downloads/dmg/package-file
  const args = [
    '-g',
    configName,
    sourceDir
  ]
  const ret = await execa('dropdmg', args)
  if (ret.stderr) {
    return {
      success: false,
      data: ret.stderr,
      msg: ret.stderr
    }
  }
  return {
    success: true,
    data: ret.stdout,
    msg: ret.stdout
  }
}
