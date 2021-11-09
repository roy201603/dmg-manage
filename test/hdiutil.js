const hdiutil = require('../lib/hdiutil')
const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
// const { step } = require('mocha-steps')
const glob = require('glob')
const { attachDmgTest } = require('./common/common')

describe('hdiutil test', function () {
  let mountPath = null
  it('-attach password file', async function () {
    // const dmgFile = path.join(__dirname,'./assets/test.dmg')
    // const dmgFile = '/Users/apple/Downloads/dmg/Disk Drill 4.4[macdo.cn].dmg'
    // const dmgFile = '/Volumes/iDisk/xxmac/xxmac/111634474710578_snapmotion-for-mac-/SnapMotion_4.3.2.dmg'
    // const dmgFile = '/Volumes/iDisk/xxmac/xxmac/111634474710578_snapmotion-for-mac-/SnapMotion_4.3.2.dmg'
    // const dmgFile = '/Volumes/iDisk/xxmac/xxmac/111634474710494_cosmicast-for-mac-/Cosmicast v2.0.4.dmg'

    // expect(error).to.be.an('error')
    mountPath = await attachDmgTest()
  })
  it('-detach', async () => {
    // mountPath = '/Volumes/SnapMotion_4.3.2'
    if (mountPath) {
      // console.log(mountPath)
      const exist = fs.existsSync(mountPath)
      if (!exist) { throw new Error('file dont exist') }
      const ret = await hdiutil.detach(mountPath)

      expect(ret.success).to.be.true
      expect(fs.existsSync(mountPath)).to.be.false
    }
  })
  it('-attach wrong password file', async function () {
    // const dmgFile = path.join(__dirname,'./assets/test.dmg')
    // const dmgFile = '/Users/apple/Downloads/dmg/Disk Drill 4.4[macdo.cn].dmg'
    // const dmgFile = '/Volumes/iDisk/xxmac/xxmac/111634474710578_snapmotion-for-mac-/SnapMotion_4.3.2.dmg'
    // const dmgFile = '/Volumes/iDisk/xxmac/xxmac/111634474710578_snapmotion-for-mac-/SnapMotion_4.3.2.dmg'
    const dmgFile = path.join(__dirname, './assets/password.dmg')
    const ret = fs.existsSync(dmgFile)
    if (!ret) { throw new Error('file dont exist') }

    const mountRes = await hdiutil.attach(dmgFile, 'xxmac.com22')
    mountPath = mountRes.outPath
    expect(mountRes.success).to.be.false
    expect(mountRes.outPath).to.not.exist
    // expect(fs.existsSync(mountPath)).to.be.false
    // expect(error).to.be.an('error')
  })
})
