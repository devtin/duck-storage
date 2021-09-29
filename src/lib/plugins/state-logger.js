import { Buffer } from 'buffer'
import { Transformers } from 'duckfficer'
import { DuckRack } from '../duck-rack.js'
import { Duck } from '../duck.js'

const STATE_LOGGER_COLLECTION = 'state-mutations'

let collectionRegistered = false

Transformers.Any = {}

const isStream = (obj) => {
  return obj && typeof obj._read === 'function' && typeof obj._readableState === 'object'
}

const safeJson = (obj, indent = 2) => {
  let cache = []
  const retVal = JSON.stringify(
    obj,
    (key, value) => {
      if (Buffer.isBuffer(value)) {
        return '<Buffer>'
      }

      if (isStream(value)) {
        return '<Stream>'
      }

      return typeof value === 'object' && value !== null
        ? cache.includes(value)
          ? undefined // Duplicate reference found, discard key
          : cache.push(value) && value // Store value in our collection
        : value
    },
    indent
  )
  cache = null
  return retVal ? JSON.parse(retVal) : retVal
}

const registerStateLoggerCollection = async (DuckStorage) => {
  if (collectionRegistered) {
    return
  }

  collectionRegistered = true

  const duckModel = new Duck({
    schema: {
      createdAt: {
        type: Date,
        default: Date.now
      },
      collection: {
        type: String,
        index: true
      },
      entryId: {
        type: String,
        index: true
      },
      entryVersion: {
        type: Number,
        index: true
      },
      method: {
        type: String,
        index: true
      },
      data: {
        state: 'Any',
        payload: 'Any',
        response: 'Any',
        newEntry: 'Any',
        events: 'Any'
      },
      error: 'Any'
    }
  })

  const duckRack = await new DuckRack(STATE_LOGGER_COLLECTION, {
    duckModel
  })
  return DuckStorage.registerRack(duckRack)
}

export const name = 'state-logger'

export async function handler ({ DuckStorage, duckRack }) {
  await registerStateLoggerCollection(DuckStorage)

  if (duckRack.name === STATE_LOGGER_COLLECTION) {
    return
  }

  duckRack.hook('after', 'apply', async ({ id, method, payload, error, state, oldDoc, methodResult, entryResult, eventsTrapped }) => {
    try {
      const stateLogger = DuckStorage.getRackByName(STATE_LOGGER_COLLECTION)

      await stateLogger.create({
        collection: duckRack.name,
        method,
        entryId: id,
        entryVersion: oldDoc._v,
        data: {
          state,
          payload: safeJson(payload),
          response: safeJson(methodResult),
          newEntry: safeJson(entryResult),
          events: safeJson(eventsTrapped)
        },
        error
      })
    } catch (err) {
      console.log('event log error', err)
    }
  })
}
