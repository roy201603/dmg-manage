#!/usr/bin/env node
const { Command, InvalidArgumentError, CommanderError } = require('commander')
const dmgMange = require('./lib/dmg-manage')
const pkgjson = require('./package.json')
const program = new Command()

/**
 shell eg:
 node shell.js\
  -f "/Users/apple/source/dmg-manage/test/assets/12244_password/password.dmg"\
  -c "drop,install,other,other"\
  -d "/Volumes/iDisk/dmg_out/macshi"\
  -cf\
  -pwd "macshi.com"\
  -af "./assets/appendFiles/已损坏修复" "./assets/appendFiles/更多软件下载.webloc"\
  -af "./assets/appendFiles/bbb"\
  -tmp "/Users/apple/Downloads/dmg_tmp_source"\
  -rv\
  -rhs "macshi.com"
 */

program.version(pkgjson.version)
  .requiredOption('-f, --file <source path>', 'dmg file source path')
  .requiredOption('-c, --pkgconfig <name>', 'package config name, package config names of "[drop],[install],[other],[unknown]" ,eg:"drop,install,other,other" ', (value) => {
    const arr = value.split(',')
    if (arr.length !== 4) {
      throw new InvalidArgumentError('pkgconfig length of array must be 4')
    }
    return arr
  })
  .requiredOption('-d, --dest <path>', 'dest path')
  .option('-cf, --closefinder', 'automatic close finder window')

  // package options
  .option('-pwd, --password <dmg file password>', 'dmg file password', '')
  .requiredOption('-af, --appendfiles <paths...>', 'append file paths')
  .requiredOption('-tmp, --tmpsource <path>', 'tmp source path')
  .option('-rv, --reversion', 'auto rename by version')
  .option('-rhs, --rehostname <host name>', 'auto rename by host name', '')

program.parse()

// const opts = program.opts()
// console.log('%o', opts)

const { password, rehostname, file, pkgconfig, dest, closefinder, appendfiles, tmpsource, reversion } = program.opts()

const dropDmgConfig = {
  drop: pkgconfig[0],
  install: pkgconfig[1],
  other: pkgconfig[2],
  unknown: pkgconfig[3]
}
const packageConfig = {
  password,
  appendFiles: appendfiles,
  tmpSource: tmpsource,
  rename: {
    version: reversion,
    hostName: rehostname
  }
}

;(async () => {
  try {
    // console.log('success')
    const ret = await dmgMange.buildDmg(
      file,
      dropDmgConfig,
      packageConfig,
      dest,
      closefinder
    )
    console.log(JSON.stringify(ret))
  } catch (err) {
    throw new CommanderError(-9, -9, err.message)
  }
})()

// throw new CommanderError('aa')
