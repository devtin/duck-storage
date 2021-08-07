import get from 'lodash/get'
import { diff } from 'deep-object-diff'
import ObjectId from 'bson-objectid'

export const name = 'unique-keys'

export function handler ({ duckRack }) {
  const keys = {}
  duckRack.duckModel.schema.children.forEach(schema => {
    if (schema.settings.unique) {
      const keyName = typeof schema.settings.unique === 'boolean' ? schema.fullPath : schema.settings.unique
      if (!keys[keyName]) {
        keys[keyName] = []
      }
      keys[keyName].push(schema.fullPath)
    }
  })

  async function checkPrimaryKeys ({ entry } = {}) {
    const $or = []
    Object.keys(keys).forEach(keyName => {
      const $and = []
      keys[keyName].forEach(propName => {
        $and.push({ [propName]: { $eq: get(entry, propName, undefined) } })
      })
      $or.push({ $and })
    })

    const found = await duckRack.list({ $or })

    if (found.length > 0 && !ObjectId(found[0]._id).equals(entry._id)) {
      // check which keys failed
      const failingEntry = found[0]
      const failingKeys = Object.keys(keys).filter(keyId => {
        const props = keys[keyId]
        const matchingKey = get(failingEntry, props)
        return Object.keys(diff(matchingKey, get(entry, props))).length === 0
      })
      throw new Error(`primary keys (${failingKeys.join(', ')}) failed for document`)
    }
  }

  duckRack.hook('before', 'create', checkPrimaryKeys)
  duckRack.hook('before', 'update', async ({ oldEntry, newEntry, entry }) => {
    await checkPrimaryKeys({ entry })
    return {
      oldEntry,
      newEntry,
      entry
    }
  })
}
