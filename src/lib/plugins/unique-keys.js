import get from 'lodash/get'
import { diff } from 'deep-object-diff'

export default function ({ DuckStorage, duckRack }) {
  const keys = {}
  console.log('duckRack.duckModel', duckRack.duckModel)
  duckRack.duckModel.schema.children.forEach(schema => {
    if (schema.settings.unique) {
      const keyName = typeof schema.settings.unique === 'boolean' ? schema.fullPath : schema.settings.unique
      if (!keys[keyName]) {
        keys[keyName] = []
      }
      keys[keyName].push(schema.fullPath)
    }
  })

  async function checkPrimaryKeys (entry) {
    const $or = []
    Object.keys(keys).forEach(keyName => {
      const $and = []
      keys[keyName].forEach(propName => {
        $and.push({ [propName]: { $eq: get(entry, propName, undefined) } })
      })
      $or.push({ $and })
    })

    const found = await duckRack.find({ $or })

    if (found.length > 0 && found[0]._id !== entry._id) {
      // check which keys failed
      const failingEntry = found[0]
      const failingKeys = Object.keys(keys).filter(keyId => {
        const props = keys[keyId]
        const matchingKey = get(failingEntry, props)
        return Object.keys(diff(matchingKey, get(entry, props))).length === 0
      })
      throw new Error(`primary keys (${failingKeys.join(', ')}) failed for document`)
    }

    return entry
  }

  duckRack.hook('before', 'create', checkPrimaryKeys)
  duckRack.hook('before', 'update', async ({ oldEntry, newEntry, entry }) => {
    await checkPrimaryKeys(entry)
    return {
      oldEntry,
      newEntry,
      entry
    }
  })
}
