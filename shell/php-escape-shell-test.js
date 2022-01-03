function escapeshellarg (cmd, isWindows, escapeWinEnv) {
  /**
     @param {string} cmd
     @param {boolean} isWindows
     @param {boolean} escapeWinEnv
     @return {string}
     */
  // Set Default Value: True.
  if (typeof (isWindows) === 'undefined') { isWindows = true }
  if (typeof (escapeWinEnv) === 'undefined') { escapeWinEnv = true }

  if (isWindows === true) {
    let escapedCmd = '"' + cmd.replace(/"/g, ' ') + '"'
    if (escapeWinEnv === true) {
      escapedCmd = escapedCmd.replace(/%/g, ' ')
    }
    return escapedCmd
  }
  return '\'' + cmd.replace('\'', '\'\\\'') + '\''
}
exports.escapeshellarg = escapeshellarg

exports.php_escapeshellarg = function (str) {
  return escapeshellarg(str, /^win/.test(process.platform))
}

function escapeshellcmd (cmd, isWindows, escapeWinEnv) {
  /**
     @param {string} cmd
     @param {boolean} isWindows
     @param {boolean} escapeWinEnv
     @return {string}
     */
  // Set Default Value: True.
  if (typeof (isWindows) === 'undefined') { isWindows = true }
  if (typeof (escapeWinEnv) === 'undefined') { escapeWinEnv = true }

  let escapedCmd = cmd.replace(
    // eslint-disable-next-line
    /(["'#&;`\|\*\?~<>\^\(\)\[\]\{\}\$\\\x0A\xFF])/g,
    (isWindows === true) ? '^$1' : '\\$1'
  )
  if ((escapeWinEnv === true) && (isWindows === true)) {
    escapedCmd = escapedCmd.replace(/%/g, '^%')
  }
  return escapedCmd
}
exports.escapeshellcmd = escapeshellcmd

exports.php_escapeshellcmd = function (str) {
  return escapeshellcmd(str, /^win/.test(process.platform), true)
}
