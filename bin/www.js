/* eslint-disable no-console */
import config from 'config'
import app from '../app.js'

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

const port = config.get('port')
app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}.`)
})
