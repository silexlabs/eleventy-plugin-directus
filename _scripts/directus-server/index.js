const fetch = require('isomorphic-fetch')
const path = require('path')
// load directus .env
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const directus = require('directus')
const process = require('process')

let server = null

exports.start = async (port = 8055) => {
  return new Promise((resolve, reject) => {
    if(server) reject('Directus server is already running')
    else {
      process.chdir(__dirname)
      return directus.createApp()
        .catch(reject)
        .then(app => {
          server = app.listen(port, () => {
            console.info(`Directus server started on localhost:${port}`)
            // fetch an image to check that public role has access to it
            // FIXME: this should not be necessary but when removed, we have access rights error: Response code 403 (Forbidden) http://localhost:8055/assets/8d6e4659-315d-4f45-b754-9d6136a8b704.png 
            fetch(`http://localhost:${port}/assets/8d6e4659-315d-4f45-b754-9d6136a8b704`)
              .then(resolve)
              .catch(reject)
          })
        })
    }
  })
}

exports.stop = () => {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if(err) reject(err)
      else {
        console.info(`Directus server stopped successfully`)
        server = null
        resolve()
      }
    })
  })
}

if(require.main === module) {
  exports.start()
}

