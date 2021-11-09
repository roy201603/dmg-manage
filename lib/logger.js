const { createLogger, transports, format, config } = require('winston')
const path = require('path')
const _ = require('lodash')

require('winston-daily-rotate-file')

// logger.error(err.message, {metadata: err.stack});
//   winston.error({message: err.message, level: err.level, stack: err.stack, meta: err})
const labelName = path.basename(require.main.filename)

// const logFormat = format.printf(info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`)

const logger = createLogger({
  levels: config.syslog.levels,
  level: 'debug',
  // format: 'YYYY-MM-DD HH:mm:ss'
  format: format.combine(
    format.label({ label: labelName }),
    format.timestamp({
      format: 'MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
    format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    format.printf((info) => {
      return `${info.timestamp} - [${info.level}]:  [${info.label}]: ${
        info.message
      } ${_.isEmpty(info.metadata) ? '' : JSON.stringify(info.metadata)}`
    })
  ),
  transports: [
    /*  new transports.Console({
      level: 'debug',
      format: format.combine(
        format.colorize({ all: true }),
        logFormat
      )
    }), */
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    new transports.DailyRotateFile({
      filename: './logs/data-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      level: 'notice',
      format: format.combine(
        format.printf((info) => {
          return JSON.stringify(info)
        })
      )
    }),
    new transports.DailyRotateFile({
      filename: './logs/log-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m'
    })
  ]
})
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }))
}

module.exports = logger
