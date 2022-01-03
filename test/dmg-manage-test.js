const hdiutil = require('../lib/hdiutil')
const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
// const { step } = require('mocha-steps')
const glob = require('glob')
const { attachDmgTest } = require('./common/common')
const dmgMange = require('../lib/dmg-manage')
const { MongoClient, ObjectId } = require('mongodb')
const config = require('../config/config')

const client = new MongoClient(config.connectionStr)

const p = (filePath) => {
  return path.join(__dirname, filePath)
}
// eslint-disable-next-line
String.prototype.includesMany = function (...args) {
  return args.filter(str => this.indexOf(str) > -1).length === args.length
}
/*
const str = 'initcall7773107b-7273-464d-9374-1bff75accc15TopCenter'
if (str.includes('initcall', 'TopCenter')) {
  console.log('Do something...')
}
 */
describe('dmgmanage test', function () {
  before(async () => {
    await client.connect()
  })
  after(async () => {
    await client.close()
  })
  const mountPath = null
  it('-package dmg file [debug]', async function () {
    // mounted dmg
    // const mountPath = await attachDmgTest()

    // expect(error).to.be.an('error')
    const dmgFile = p('./assets/12244_password/password.dmg')
    const dest = '/Volumes/iDisk/dmg_out/macshi'
    const dropDmgConfig = {
      drop: 'drop',
      install: 'install',
      other: 'other',
      unknown: 'other'
    }

    const packageConfig = {
      password: 'xxmac.com',
      appendFiles: [
        p('./assets/appendFiles/已损坏修复'),
        p('./assets/appendFiles/更多软件下载.webloc')
      ],
      tmpSource: '/Users/apple/Downloads/dmg_tmp_source', // dropdmg 打包时候用到的源临时文件夹
      rename: {
        version: true,
        hostName: 'macshi.com'
      }
    }

    try {
      const version = '4.3.2'
      const ret = await dmgMange.buildDmg(
        dmgFile,
        dropDmgConfig,
        packageConfig,
        dest,
        false
      )

      // const ret = {
      //   allFiles: ['SnapMotion.app', '已损坏修复', '更多软件下载.webloc'],
      //   beforeAllFiles: ['SnapMotion.app', '将应用拖入此文件夹完成安装', '更多Mac破解软件.webloc'],
      //   version: '4.3.2',
      //   type: 'drop',
      //   localSource: '/Users/apple/source/dmg-manage/test/assets/12244_password/password.dmg',
      //   localDest: '/Volumes/iDisk/dmg_out/macshi/12244_password/SnapMotion_4.3.2(macshi.com).dmg',
      //   relateDest: '12244_password/SnapMotion_4.3.2(macshi.com).dmg',
      //   success: true,
      //   sourceSize: 10022912,
      //   size: 9932147
      // }

      assert.includeMembers(ret.beforeAllFiles, ['SnapMotion.app', '将应用拖入此文件夹完成安装', '更多Mac破解软件.webloc'])
      assert.includeMembers(ret.allFiles, ['已损坏修复', '更多软件下载.webloc'])
      assert.isNotEmpty(ret.version, '版本号不能为空')
      assert.equal(ret.type, 'drop')
      assert.equal(ret.localSource, dmgFile)
      assert.equal(fs.existsSync(ret.localDest), true, '源文件必须存在')
      assert.include(ret.localDest, packageConfig.rename.hostName, `生成的文件名称必须包含域名信息：${packageConfig.rename.hostName}`)
      assert.include(ret.localDest, version, `生成的文件名称必须包含版本号：${version}`)
      assert.isNotEmpty(ret.relateDest)
      assert.equal(ret.success, true, '生成dmg必须成功')
      assert.equal(Math.abs(ret.sourceSize - ret.size) < 190000, true, '生成的文件不能小于190000')
    } catch (error) {
      assert.ifError(error)
      // throw error
    }
  })
})
