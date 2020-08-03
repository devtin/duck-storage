const { jsDirIntoJson, settings } = require('js-dir-into-json')
const path = require('path')
settings.fileLoader = require('esm')(module)

jsDirIntoJson(path.join(__dirname, './entities'))
  .then(obj => {
    console.log(obj)
  })
