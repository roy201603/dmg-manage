const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const hdiutil = require('../../lib/hdiutil')

module.exports.attachDmgTest = async () => {
  const dmgFile = path.join(__dirname, '../assets/password.dmg')
  const ret = fs.existsSync(dmgFile)
  if (!ret) { throw new Error('file dont exist') }

  const mountRes = await hdiutil.attach(dmgFile, 'xxmac.com')
  const mountPath = mountRes.outPath
  expect(mountRes.success).to.be.true
  expect(mountRes.outPath).to.not.be.empty
  expect(fs.existsSync(mountPath)).to.be.true

  return mountPath
}
