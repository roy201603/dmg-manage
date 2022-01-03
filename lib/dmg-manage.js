const path = require('path')
const fs = require('fs')
const readline = require('readline')
const logger = require('../lib/logger')
const { logFile, sleep } = require('../lib/util')
const hdiutil = require('../lib/hdiutil')
const glob = require('glob')
const shelljs = require('shelljs')
const execa = require('execa')
const fse = require('fs-extra')
// const shellParse = require('shell-quote').parse

const files = [
  ''
]
const ignore = [
  /\.webloc/i,
  /拖入/
]
const configName = {
  pkg: 'install', // pkg 类型的是直接点击安装
  app: 'drop'// app 类型的是拖动安装
}
class DmgManage {
  checkAppType (files) {
    // 第二种
    // 判断文件包含 pkg 文件
    //
    const numbers = {
      appNumber: files.filter(v => v.includes('.app')).length,
      dmgNumber: files.filter(v => v.includes('.dmg')).length,
      pkgNumber: files.filter(v => v.includes('.pkg')).length
    }
    if (numbers.appNumber > 1 || numbers.dmgNumber > 1 || numbers.pkgNumber > 1) {
      console.error(`出现两个重复的类型,${files.join(', ')}`)
    }

    // 第一种
    // 判断文件包含【拖入】是否为文件夹
    //
    const result = files.filter(v => v.includes('拖入') || path.basename(v) === 'Applications')
    if (result.length > 1) throw new Error('有两个拖入文件')

    if (result.length === 1) {
      const test = false
      // const stats = fs.lstatSync(result[0])
      // 判断匹配到的路径是否为系统链接类型
      // if (!stats.isSymbolicLink()) {
      if (test) {
        throw new Error('拖入文件类型错误')
      } else {
        return {
          ...numbers,
          type: 'drop',
          // filePath: result[0],
          result,
          files
        }
      }
    }

    // 第二种
    // 判断文件包含 pkg 文件
    //
    // result = files.filter(v => v.includes('.pkg'))
    // if (numbers.pkgNumber > 1) throw new Error('有两个pkg文件')
    if (numbers.pkgNumber === 1) {
      return {
        ...numbers,
        type: 'install',
        // filePath: result[0],
        result,
        files
      }
    }

    // 第三种 未知类型
    // 判断文件包含 dmg 文件
    //
    return {
      ...numbers,
      type: 'unknown',
      // filePath: result[0],
      result: null,
      files
    }

    // 第二种情况 结果大于一的，可能同时有 .app 或者 .pkg 或者 .dmg
  }

  /**
   *
   * @param {array[string]} files
   * @returns
   */
  filterFiles (files) {
    return files.filter(v => {
      if (v.match(/\/Applications$/)) return false
      if (v.match(/\.webloc|拖入|免责声明/i)) {
        return false
      }
      return true
    })
  }

  async run () {
    // const fileList = ['12']

    const fileStream = fs.createReadStream('./dmg-filelist.txt')

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.
      // console.log(`Line from file: ${line}`)
      try {
        const result = this.checkAppType(line.split(','))
        const result2 = this.filterFiles(line.split(','))
        // console.log(`===>${line} , type:${JSON.stringify(result)}`, '\n\r')
        // console.log(`===>${line} , after filter:${JSON.stringify(result2)}`, '\n\r')
      } catch (error) {
        console.error(`===>${line} , message:${error.message}`)
        // logger.error()
        logger.error(`===>${line} , message:${error.message}`)
        logFile('err-checkType.txt', `===>${line} , message:${error.message}`)
      }
    }
  }

  getLaunchApp (dmgPath, files) {
    const pkgFiles = files.filter(v => v.includes('.pkg'))
    if (pkgFiles.length > 0) return null
    const filterFiles = files.filter(v => v.includes('.app'))
    if (filterFiles.length === 1) return filterFiles[0]
    const basename = path.basename(dmgPath)
    let newBaseName = path.basename(dmgPath).split(' ').shift()
    if (basename === newBaseName) { newBaseName = path.basename(dmgPath).split('_').shift() }
    return files.find(v => path.basename(v).toLowerCase().replace(/\.app|\.pkg/i, '') === newBaseName.toLocaleLowerCase())
  }

  async buildDmg (dmgFile, packageConfig, options, dest, closeFinder = false) {
    if (!dest) {
      throw new Error('输出目录不能为空')
    }
    const isFile = fs.statSync(dmgFile).isFile
    if (isFile && !['.dmg', '.zip'].includes(path.extname(dmgFile))) {
      throw new Error('输入文件格式不支持，只支持dmg,zip格式文件，文件：' + dmgFile)
    }
    const extname = path.extname(dmgFile)
    const opts = {
      password: 'xxmac.com',
      appendFiles: [],
      // tmpSource: '/Users/apple/Downloads/dmg_tmp_source', // 临时文件夹
      rename: {
        version: true,
        hostName: 'macshi.com'
      },
      ...options
    }
    /*    const dmgFiles = [
      '/Volumes/iDisk/xxmac/xxmac/111634474717666_airfoil-for-mac-vb1/Airfoil 5 v5.10.0b1.dmg',
      '/Volumes/iDisk/xxmac/xxmac/151634475669228_little-snitch-for-mac-/Little Snitch 4 v4.4.3.dmg',
      '/Volumes/iDisk/xxmac/xxmac/111634474710802_roxio-toast-titanium-for-mac-/Roxio Toast Titanium v17.4.dmg',
      '/Volumes/iDisk/xxmac/xxmac/121634475021656_room-arranger-for-mac-/Room Arranger 9.5.5.dmg'
    ] */

    const itemObj = {}

    if (typeof dmgFile !== 'string') {
      throw new Error('dmgFile must be string')
    }
    const dmg = dmgFile

    let mountDir
    let unZipDir = ''
    try {
      let result
      //
      // 第一步：加载dmg文件
      //
      if (isFile) {
        if (extname === '.dmg') {
          result = await hdiutil.attach(dmg, opts.password)
          if (!result.success) {
          // console.error('===>载入错误' + dmg)
          // console.error(result)
          // logger.error(`${dmg},` + files.join(','), { result })
            throw new Error('===>载入错误' + dmg)
          }
          mountDir = result.outPath
        } else if (extname === '.zip') {
          unZipDir = path.join('/tmp', path.basename(dmg).replace(extname, ''))
          result = await execa('unzip', ['-o', dmg, '-d', unZipDir])
          shelljs.rm('-rf', path.join(unZipDir, '__MACOSX'))
          mountDir = unZipDir
        }
      } else {
        mountDir = dmgFile
      }

      // const testDmg = '/Volumes/iDisk/xxmac/xxmac/111634474710494_cosmicast-for-mac-/Cosmicast v2.0.4.dmg'

      //
      // 第二步：获取dmg文件里面的所有列表
      //
      // dmg加载之后的盘目录
      // mountDir = isFile ? result.outPath : dmgFile
      const files = glob.sync(path.join(mountDir, '/*'))
      const launchApp = this.getLaunchApp(dmg, files)
      const { size: sourceSize } = fs.statSync(dmg)
      let version
      if (launchApp) {
        const versionResult = await hdiutil.getAppVersion(launchApp)
        if (!versionResult.success) {
          logger.error('获取版本号错误,dmg:', dmg)
          console.error('获取版本号错误,dmg:', dmg)
          // throw new Error('获取版本号错误,dmg:', dmg)
        }
        version = versionResult.data
      }

      // logger.notice('文件列表',{files})

      //
      // 第三步：检测package 类型，并且检测 packageConfig 参数是否有传该类型的配置名称
      //
      const dmgType = this.checkAppType(files)
      // dmgType.type = 'unknown'
      if (!packageConfig[dmgType.type]) {
        throw new Error(`参数packageConfig没有设置相关配置${dmgType.type}`)
      }

      //
      // 第四步：过滤掉忽略文件，并且复制到临时目录
      //
      const includeFiles = this.filterFiles(files)
      // const includeFiles = files
      if (includeFiles.length === 0) throw new Error('没有需要打包的文件,dmg:' + dmg)
      const newTmpSource = path.join(opts.tmpSource, path.basename(mountDir))
      fse.ensureDirSync(newTmpSource)
      // shelljs.mkdir('-p', newTmpSource)
      sleep(500)

      /* if (includeFiles.length > 1) {
        const shellPath = `${mountDir}/{${includeFiles.map(v => path.basename(v)).join(',')}}`.replace(/ /g, '\\ ')
        // shelljs.cp 方法-P 有问题？
        result = shelljs.exec(`cp -R ${shellPath} '${newTmpSource}'`)
      } else {
        result = shelljs.cp('-R', includeFiles[0], newTmpSource)
      } */

      // 用这种方式复制的文件，文件图标只能显示原始的图标
      includeFiles.concat(opts.appendFiles).forEach(f => {
        result = execa.sync('cp', ['-Rf', f, newTmpSource])
        if (result.stderr) {
          throw new Error('复制文件错误，message：', result.stderr)
        }
      })

      itemObj.allFiles = [...includeFiles, ...opts.appendFiles].map(v => path.basename(v))

      await hdiutil.detach(mountDir)

      //
      // 第五步：根据dmgType选择dropdmg 的配置文件进行打包
      //
      const configName = packageConfig[dmgType.type]
      result = await hdiutil.packageByDropDmg(configName, newTmpSource)
      if (!result.success) {
        throw new Error('打包文件出错，message：', result.msg)
      }
      shelljs.rm('-rf', newTmpSource)
      if (unZipDir) {
        shelljs.rm('-rf', unZipDir)
      }

      //
      // 第六步：重命名文件,移动文件到dest目录
      //
      const fileOutPath = result.data
      // 重命名加版本号
      const baseName = path.basename(fileOutPath)
      const extName = path.extname(fileOutPath)
      let fileName = baseName.replace(extName, '')

      if (version && opts.rename.version && !baseName.includes(version)) {
        fileName += `_${version}`
      }
      if (opts.rename.hostName && !baseName.includes(opts.rename.hostName)) {
        fileName += `(${opts.rename.hostName})`
      }
      // 移动文件到dest目录
      const parentDirName = path.basename(path.join(dmg, '..'))
      const newDest = path.join(dest, parentDirName, fileName + extName)
      fse.ensureDirSync(path.dirname(newDest))
      result = shelljs.mv(fileOutPath, newDest)
      if (result.stderr) {
        throw new Error('打包后的dmg转存失败，message：', result.stderr)
      }

      //
      // 第七步：封装itemObject
      //
      const { size: newSize } = fs.statSync(newDest)
      itemObj.beforeAllFiles = files.map(v => path.basename(v))
      itemObj.version = version
      itemObj.type = dmgType.type
      itemObj.localSource = dmg
      itemObj.localDest = newDest
      itemObj.relateDest = path.join(parentDirName, fileName + extName)
      itemObj.success = true
      itemObj.sourceSize = sourceSize
      itemObj.size = newSize
      // close all finder windows via osascript
      if (closeFinder) {
        execa.commandSync(path.join(__dirname, '../shell/close_finder.scpt'))
      }

      return itemObj
    } catch (error) {
      if (mountDir) {
        await hdiutil.detach(mountDir)
      }
      throw error
    }
  }
}

(async () => {
  // 真实文件
  const lines = [
    // drop 多文件 80M
    '/Volumes/Airfoil 5 v5.10.0b1/Airfoil Satellite.app, /Volumes/Airfoil 5 v5.10.0b1/Airfoil.app, /Volumes/Airfoil 5 v5.10.0b1/CORE Keygen.app, /Volumes/Airfoil 5 v5.10.0b1/将应用拖入此文件夹完成安装, /Volumes/Airfoil 5 v5.10.0b1/更多Mac软件下载.webloc',
    // install 多文件（app） 64M
    '/Volumes/Little Snitch 4 v4.4.3/Hosts.app, /Volumes/Little Snitch 4 v4.4.3/卸载 Little Snitch.app, /Volumes/Little Snitch 4 v4.4.3/安装 Little Snitch.app, /Volumes/Little Snitch 4 v4.4.3/更多Mac软件.webloc, /Volumes/Little Snitch 4 v4.4.3/注册码.rtf',
    // install 多文件（pkg）401M
    '/Volumes/Roxio Toast Titanium v17.4/Toast Titanium.pkg,/Volumes/Roxio Toast Titanium v17.4/更多Mac软件.webloc,/Volumes/Roxio Toast Titanium v17.4/汉化包.pkg,/Volumes/Roxio Toast Titanium v17.4/注册码.txt',
    // '/Volumes/Screencast_1.5/更多Mac软件.webloc'
    // install 多文件(dmg) 26M
    '/Volumes/Room Arranger 9.5.5/rooarr955.dmg,/Volumes/Room Arranger 9.5.5/序列号.txt,/Volumes/Room Arranger 9.5.5/查看帮助.webloc'
  ]

  const lines2 = [
    // drop 单个文件（app）
    '/Volumes/Airfoil 5 v5.10.0b1/Airfoil.app,/Volumes/Airfoil 5 v5.10.0b1/将应用拖入此文件夹完成安装, /Volumes/Airfoil 5 v5.10.0b1/更多Mac软件下载.webloc',
    // install 单文件（app）
    '/Volumes/Little Snitch 4 v4.4.3/卸载 Little Snitch.app, /Volumes/Little Snitch 4 v4.4.3/更多Mac软件.webloc, /Volumes/Little Snitch 4 v4.4.3/注册码.rtf',
    // install 单文件（pkg）
    '/Volumes/Roxio Toast Titanium v17.4/Toast Titanium.pkg,/Volumes/Roxio Toast Titanium v17.4/更多Mac软件.webloc,/Volumes/Roxio Toast Titanium v17.4/注册码.txt',
    // '/Volumes/Screencast_1.5/更多Mac软件.webloc'
    // install 单文件(dmg)
    '/Volumes/Room Arranger 9.5.5/rooarr955.dmg,/Volumes/Room Arranger 9.5.5/序列号.txt,/Volumes/Room Arranger 9.5.5/查看帮助.webloc'
  ]

  const dmgFiles = [
    '/Volumes/iDisk/xxmac/xxmac/111634474717666_airfoil-for-mac-vb1/Airfoil 5 v5.10.0b1.dmg',
    '/Volumes/iDisk/xxmac/xxmac/151634475669228_little-snitch-for-mac-/Little Snitch 4 v4.4.3.dmg',
    '/Volumes/iDisk/xxmac/xxmac/111634474710802_roxio-toast-titanium-for-mac-/Roxio Toast Titanium v17.4.dmg',
    '/Volumes/iDisk/xxmac/xxmac/121634475021656_room-arranger-for-mac-/Room Arranger 9.5.5.dmg'
  ]
  const mg = new DmgManage()
  const files = [
    '/Volumes/Airfoil 5 v5.10.0b1/Airfoil Satellite.app',
    '/Volumes/Airfoil 5 v5.10.0b1/Airfoil.app', '/Volumes/Airfoil 5 v5.10.0b1/CORE Keygen.app', '/Volumes/Airfoil 5 v5.10.0b1/将应用拖入此文件夹完成安装', '/Volumes/Airfoil 5 v5.10.0b1/更多Mac软件下载.webloc']
  // const launchApp = mg.getLaunchApp('/Volumes/iDisk/xxmac/xxmac/111634474717666_airfoil-for-mac-vb1/Airfoil 5 v5.10.0b1.dmg', files)
  // const version = await hdiutil.getAppVersion(launchApp)
  // const ret = mg.filterFiles('/Volumes/2Do_2.6.13/2Do.app,/Volumes/2Do_2.6.13/免责声明.rtf,/Volumes/2Do_2.6.13/将应用拖入此文件夹完成安装,/Volumes/2Do_2.6.13/更多Mac软件.webloc'.split(','))

  const togo = false
  if (!togo) return

  await mg.buildDmg(
    '/Volumes/iDisk/xxmac/xxmac/111634474717666_airfoil-for-mac-vb1/Airfoil 5 v5.10.0b1.dmg',
    {
      drop: 'drop',
      install: 'install',
      other: 'other',
      unknown: 'other'
    },
    {
      password: 'xxmac.com',
      appendFiles: [
        '/Users/apple/Downloads/dmg/assests_new/已损坏修复',
        '/Users/apple/Downloads/dmg/assests_new/更多软件下载.webloc'
      ],
      tmpSource: '/Users/apple/Downloads/dmg_tmp_source', // 临时文件夹
      rename: {
        version: true,
        hostName: 'macshi.com'
      }
    },
    '/Users/apple/Downloads/dmg_out(macshi.com)'
  )
})()

module.exports = new DmgManage()
