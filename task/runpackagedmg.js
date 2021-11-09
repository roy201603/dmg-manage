// const { step } = require('mocha-steps')
const logger = require('../lib/logger')
const execa = require('execa')
const glob = require('glob')
const path = require('path')
const { MongoClient, ObjectId } = require('mongodb')
const { logFile, sleep } = require('../lib/util')
const { escapeshellcmd } = require('php-escape-shell')

const client = new MongoClient('mongodb://192.168.31.121:27017/')

function copyFileToSync (sourceDir, dest, limit = 5) {
  // shell mv -f /Volumes/iDisk/dmg_out/macshi/{161634475799553_maccleanse-for-mac-,161634475799551_a-better-finder-attributes-6-for-mac-} /Volumes/iDisk/test
  let dirs = glob.sync(path.join(sourceDir, '*/')) // 注意 */ 是获取所有文件夹， * 是获取所有文件包括文件夹
  let result = {
    stderr: '',
    stdout: ''
  }
  dirs = dirs.slice(0, limit)
  if (dirs.length > 0) {
    for (const dir of dirs) {
      // 这里需要处理下结尾的 '/' 符号
      result = execa.sync('mv', ['-f', dir.replace(/\/$/, ''), dest])
      if (result.stderr) {
        console.log(result.stderr)
      }
    }

    // shelljs.cp 方法-P 有问题？
    // result = execa.sync(`mv -f ${shellPath} '${dest}'`)
    const shellPath = `${sourceDir}/{${dirs.map(v => path.basename(v)).join(',')}}`.replace(/ /g, '\\ ')
    console.log(`===>复制文件 mv -f ${shellPath} '${dest}'`)
  }
  return result
}

async function run (limit = 100) {
  const dmgMg = require('../lib/dmg-manage')
  const dropDmgConfig = {
    drop: 'drop',
    install: 'install',
    other: 'other',
    unknown: 'other'
  }
  const basePath = '/Users/apple/Downloads'
  const dest = '/Volumes/iDisk/dmg_out/macshi'

  // 打包次数，一个循环周期默认为5次，每五次执行一次任务
  const numbers = {
    packageNumber: 0,
    interval: 6
  }

  const packageConfig = {
    password: 'xxmac.com',
    appendFiles: [
      `${basePath}/dmg/assests_new/已损坏修复`,
      `${basePath}/dmg/assests_new/更多软件下载.webloc`
    ],
    tmpSource: '/Users/apple/Downloads/dmg_tmp_source', // dropdmg 打包时候用到的源临时文件夹
    rename: {
      version: true,
      hostName: 'macshi.com'
    }
  }

  await client.connect()
  const database = client.db('test')
  const Postpan = database.collection('postpan.macbl')

  let rewriteapp = glob.sync('/Volumes/iDisk/dmg_out/macshi/*/').map(v => path.basename(v).split('_').shift())
  rewriteapp = rewriteapp.map(v => Number(v))

  const cursor = Postpan.find({
    mypanState: '0',
    myPanInfo: {
      $ne: null
    }
    // dmgInfoState: { // 还没有大包的文件
    // $eq: null
    // $eq: '-9'
    // },
    // dmgInfoRemark: '复制文件错误，message：'
    // _id: new ObjectId('617244ab6b39148ecf4d8b24'),
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
        dest,
        numbers.packageNumber > numbers.interval // 每一次循环关闭一次finder窗口
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
      // console.log(updateRes)
      console.log('')
      // 复制数据
      if (numbers.packageNumber > numbers.interval) {
        // 同步文件到百度同步盘文件夹
        // copyFileToSync(dest, '/Volumes/iDisk/xxmac/macshi', numbers.interval)
      }
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
      if (numbers.packageNumber > numbers.interval) {
        numbers.packageNumber = 0
      } else {
        numbers.packageNumber++
      }
    }
  }

  // await dmgMg.run()
}

async function test (str) {
  // return str.replace(/(["\s'$`\\])/g, '\\$1')
  const { command } = await execa('echo', [str])
  return await execa.command(command) // works; `command` is 'echo unicorns'
}

;(async () => {
  // const str = 'Understand v5.1(1010)/test(sd)/a'
  // const a = escapeshellcmd(str, false, false)

  await run(700)

  // await test()
  console.log('done')
})()
