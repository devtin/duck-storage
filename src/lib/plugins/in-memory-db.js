import cloneDeep from 'lodash/cloneDeep'
import { Schema, Utils } from 'duckfficer'
import sift from 'sift'

export const name = 'in-memory-db'

const storeKey = {}

const sortArray = (arr, sort) => {
  const toIndex = (value) => {
    if (typeof value === 'boolean') {
      return value ? 1 : -1
    }
    return value
  }
  const calcIndex = (a, b, factor = 1) => {
    if (a === b) {
      return 0
    }

    if (typeof a === 'string' && typeof b === 'string') {
      return toIndex(a > b) * factor
    }
    const A = toIndex(a)
    const B = toIndex(b)

    return (A - B) * factor
  }

  Utils.obj2dot(sort).reverse().forEach(prop => {
    arr = arr.sort((a, b) => {
      return calcIndex(Utils.find(a, prop), Utils.find(b, prop), toIndex(Utils.find(sort, prop)))
    })
  })
  return arr
}

const runQuery = (entity, query) => {
  return entity.filter(sift(query))
}

const Query = new Schema({
  type: 'Query'
})

export function handler ({ DuckStorage, duckRack }) {
  storeKey[duckRack.name] = {}
  duckRack.hook('before', 'create', ({ entry }) => {
    storeKey[duckRack.name][entry._id] = {
      ...entry,
      _id: entry._id.toString()
    }
  })

  duckRack.hook('before', 'update', ({ entry, result }) => {
    storeKey[duckRack.name][entry._id] = entry
    result.push(entry)
  })

  duckRack.hook('before', 'deleteById', ({ _id, result }) => {
    const foundEntry = storeKey[duckRack.name][_id]

    if (foundEntry) {
      delete storeKey[duckRack.name][_id]
      result.push(foundEntry)
    }
  })
  duckRack.hook('before', 'list', async ({ query, result, sort }) => {
    const getResults = async () => {
      const results = runQuery(Object.values(storeKey[duckRack.name]), await Query.parse(query))

      if (sort) {
        return sortArray(results, sort)
      }

      return results
    }

    const results = await getResults()
    results.length > 0 && result.push(...results)
  })
  duckRack.hook('before', 'findOneById', async ({ _id, _v, result }) => {
    if (result.length === 0) {
      const queryInput = {
        _id: typeof _id === 'string' ? _id : _id.toString()
      }

      if (_v) {
        queryInput._v = _v
      }

      const theQuery = await Query.parse(queryInput)
      const entry = runQuery(Object.values(storeKey[duckRack.name]), theQuery)[0]
      if (entry) {
        // cloneDeep prevents the local entry being mutated
        result.push(cloneDeep(entry))
      }
    }
  })
}
