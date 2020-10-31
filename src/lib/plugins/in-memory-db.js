import cloneDeep from 'lodash/cloneDeep'
import { Schema, Utils } from 'duckfficer'
import sift from 'sift'

export default function ({ store = [], storeKey = {} } = {}) {
  const { forEach } = Utils

  const runQuery = (entity, query) => {
    return entity.filter(sift(query))
  }

  const Query = new Schema({
    type: 'Query'
  })

  return ({ duckRack }) => {
    duckRack.hook('after', 'create', ({ entry }) => {
      storeKey[entry._id] = entry
      store.push(entry)
    })
    duckRack.hook('after', 'read', ({ entry }) => {
      storeKey[entry._id] = entry
      store.push(entry)
    })
    duckRack.hook('after', 'update', ({ entry }) => {
      storeKey[entry._id] = entry
      store.push(entry)
    })
    duckRack.hook('after', 'deleteById', ({ _id }) => {
      let foundIndex = null

      forEach(store, (item, i) => {
        if (item._id === _id) {
          foundIndex = i
          return false
        }
      })

      const foundEntry = storeKey[_id]

      if (foundEntry) {
        delete storeKey[_id]
      }

      if (foundIndex !== null) {
        store.splice(foundIndex, 1)
      }
    })
    duckRack.hook('after', 'find', ({ query, result }) => {
      const results = runQuery(store, Query.parse(query))
      results.length > 0 && result.push(...results)
    })
    duckRack.hook('after', 'findOneById', async ({ _id, queryInput, result }) => {
      if (result.length === 0) {
        const theQuery = await Query.parse(queryInput)
        const entry = runQuery(store, theQuery)[0]
        if (entry) {
          // cloneDeep prevents the local entry being mutated
          result.push(cloneDeep(entry))
        }
      }
    })
  }
}
