// const { step } = require('mocha-steps')
const logger = require('../lib/logger')
const { MongoClient, ObjectId } = require('mongodb')
const { logFile, sleep } = require('../lib/util')

const client = new MongoClient('mongodb://192.168.31.121:27017/')

async function run (limit = 100) {
  const dmgMg = require('../lib/dmg-manage')
  const dropDmgConfig = {
    drop: 'drop',
    install: 'install',
    other: 'other',
    unknown: 'other'
  }
  const basePath = '/Users/apple/Downloads'
  const dest = `${basePath}/dmg_out/macshi`
  const packageConfig = {
    password: 'xxmac.com',
    appendFiles: [
      `${basePath}/dmg/assests_new/已损坏修复`,
      `${basePath}/dmg/assests_new/更多软件下载.webloc`
    ],
    tmpSource: `${basePath}/dmg_tmp_source`, // 临时文件夹
    rename: {
      version: true,
      hostName: 'macshi.com'
    }
  }

  await client.connect()
  const database = client.db('test')
  const Postpan = database.collection('postpan.macbl')

  const cursor = Postpan.find({
    mypanState: '0',
    myPanInfo: {
      $ne: null
    },
    dmgInfoState: { // 还没有大包的文件
      $eq: null
    }
    // _id: new ObjectId('617241706b39148ecf4d8391')
  }).limit(limit)

  const list = await cursor.toArray()

  let index = 1
  for (const pan of list) {
    // /mac-apps/xxmac/111634474710578_snapmotion-for-mac-/SnapMotion_4.3.3.dmg
    if (!pan.myPanInfo.path) {
      console.error('dmg路径为空', pan._id)
      continue
    }

    try {
      const packageResult = await dmgMg.buildDmg(
        pan.myPanInfo.path.replace(/^\/mac-apps/, '/Volumes/iDisk/xxmac'),
        dropDmgConfig,
        packageConfig,
        dest
      )

      await client.connect()
      // update mongodb
      const updateRes = await Postpan.updateOne({ _id: pan._id }, {
        $set: {
          dmgInfoState: '0',
          dmgInfo: {
            ...packageResult
          },
          dmgInfoRemark: '打包成功'
        }
      })

      logFile('./after-package-all.txt', JSON.stringify(packageResult) + ',')

      logger.notice(`[${index}/${list.length}]${packageResult.localSource}===>${packageResult.localDest}`, { beforFiles: packageResult.beforeAllFiles.join(','), data: packageResult })
      console.log(`[${index}/${list.length}][${pan._id.toString()}]${packageResult.localSource}===>${packageResult.localDest}`)
      console.log(updateRes)
      console.log('')
      await sleep(1500)
    } catch (error) {
      await client.connect()
      const updateRes = await Postpan.updateOne({ _id: pan._id }, {
        $set: {
          dmgInfoState: '-9',
          dmgInfoRemark: error.message
        }
      })

      console.error(error.message, '\n\r')
      console.error(pan)
      logger.error(error.message, { data: pan })
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close()
      index++
    }
  }

  // await dmgMg.run()
}
;(async () => {
  await run(300)
  console.log('done')
})()
