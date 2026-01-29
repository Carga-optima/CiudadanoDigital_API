import fs from 'fs'
import path from 'path'
import config from 'config'

const logDir = config.get('logDir')

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  SUCCESS: 'SUCCESS',
}

class Logger {
  constructor(config = {}) {
    this.baseLogsDir = logDir
    this.filename = config.filename || 'app.log'
    this.enableFile = config.enableFile !== undefined ? config.enableFile : true
    this.maxFileSize = config.maxFileSize || 5 * 1024 * 1024 // 5MB por defecto

    // Crear carpeta con fecha del día (YYYY-MM-DD)
    const currentDate = new Date().toISOString().split('T')[0]
    this.logsDir = path.join(this.baseLogsDir, currentDate)

    // Crear directorio de logs con fecha si no existe
    // recursive: true crea tanto /logs como /logs/2025-10-24 si no existen
    if (this.enableFile) {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true })
      }
    }
  }

  /**
   * Obtiene el nombre del archivo que llamó al logger
   * @param {Error} error - Error stack para extraer el archivo origen
   * @returns {string} Nombre del archivo origen
   */
  getCallerFile(error) {
    const stack = error.stack.split('\n')
    // El stack[2] generalmente contiene el archivo que llamó a log()
    const callerLine = stack[3] || stack[2] || ''
    const match = callerLine.match(/\((.+):(\d+):(\d+)\)/) || callerLine.match(/at (.+):(\d+):(\d+)/)

    if (match) {
      const fullPath = match[1]
      return path.basename(fullPath)
    }

    return 'unknown'
  }

  /**
   * Formatea el mensaje de log
   * @param {Object} logData - Datos del log
   * @returns {string} Mensaje formateado
   */
  formatLog(logData) {
    const { timestamp, level, sourceFile, title, content } = logData

    const titlePart = title ? ` [${title}]` : ''
    const header = `[${timestamp}] [${level}] [${sourceFile}]${titlePart}`

    let contentStr
    if (typeof content === 'object') {
      contentStr = JSON.stringify(content, null, 2)
    } else {
      contentStr = content
    }

    return `${header}\n${contentStr}\n${'─'.repeat(80)}\n`
  }

  /**
   * Rota el archivo de log si excede el tamaño máximo
   */
  rotateLogFile() {
    const logPath = path.join(this.logsDir, this.filename)

    if (!fs.existsSync(logPath)) return

    const stats = fs.statSync(logPath)
    if (stats.size >= this.maxFileSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const newFilename = `${path.parse(this.filename).name}_${timestamp}.log`
      const newPath = path.join(this.logsDir, newFilename)

      fs.renameSync(logPath, newPath)
    }
  }

  /**
   * Escribe el log en archivo
   * @param {string} formattedLog - Log formateado
   */
  writeToFile(formattedLog) {
    if (!this.enableFile) return

    this.rotateLogFile()

    const logPath = path.join(this.logsDir, this.filename)
    fs.appendFileSync(logPath, formattedLog, 'utf8')
  }

  /**
   * Función principal de logging
   * @param {string} level - Nivel del log (ERROR, WARN, INFO, DEBUG, SUCCESS)
   * @param {any} content - Contenido del log
   * @param {Object} options - Opciones adicionales
   * @param {string} options.title - Título opcional del log
   * @param {string} options.sourceFile - Archivo origen (se detecta automáticamente si no se provee)
   */
  log(level, content, options = {}) {
    const timestamp = new Date().toISOString()
    const sourceFile = options.sourceFile || this.getCallerFile(new Error())
    const { title } = options

    const logData = {
      timestamp,
      level: level.toUpperCase(),
      sourceFile,
      title,
      content,
    }

    const formattedLog = this.formatLog(logData)

    if (level === LOG_LEVELS.ERROR || level === LOG_LEVELS.WARN) {
      console.error(formattedLog)
    } else {
      console.log(formattedLog)
    }

    if (this.enableFile) {
      try {
        this.writeToFile(formattedLog)
      } catch (fileErr) {
        console.error(`[Logger] Error escribiendo archivo: ${fileErr.message}`)
      }
    }
  }

  error(content, options = {}) {
    this.log(LOG_LEVELS.ERROR, content, options)
  }

  warn(content, options = {}) {
    this.log(LOG_LEVELS.WARN, content, options)
  }

  info(content, options = {}) {
    this.log(LOG_LEVELS.INFO, content, options)
  }

  debug(content, options = {}) {
    this.log(LOG_LEVELS.DEBUG, content, options)
  }

  success(content, options = {}) {
    this.log(LOG_LEVELS.SUCCESS, content, options)
  }
}

const logger = new Logger()

export { Logger, LOG_LEVELS }
export default logger
