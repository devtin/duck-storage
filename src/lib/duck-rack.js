import { EventEmitter } from 'events'
import { Utils, Schema } from 'duckfficer'
import sift from 'sift'
import camelCase from 'lodash/camelCase'
import kebabCase from 'lodash/kebabCase'
import cloneDeep from 'lodash/cloneDeep'
import { detailedDiff } from 'deep-object-diff'
import Promise from 'bluebird'

import './types/object-id.js'
import './types/uuid.js'
import './types/query.js'
import { Methods } from './schemas/method.js'
import { Hooks } from './hooks'

// todo: describe the duck proxy

/**
 * @typedef {Object} DuckProxy
 * @return {boolean}
 */

/**
 * Returns true when objB does not match objA
 * @param {Object} objA
 * @param {Object} objB
 * @return {boolean}
 */
const objectHasBeenModified = (objA, objB) => {
  const diff = detailedDiff(objA, objB)
  let modified = false
  Object.keys(diff).forEach((key) => {
    Object.keys(diff[key]).forEach(prop => {
      if (modified) {
        return
      }

      modified = Object.keys(diff[key][prop]).length > 0
    })
  })
  return modified
}

class DuckRackError extends Error {
  constructor (message, error) {
    super(message)
    this.error = error
  }
}

class EventError extends Error {
  constructor (message) {
    super(message)
    this.name = 'EventError'
  }
}

class MethodError extends Error {
  constructor (message) {
    super(message)
    this.name = 'MethodError'
  }
}

const { forEach } = Utils

const Query = new Schema({
  type: 'Query'
})

/**
 * @class DuckRack
 * @classdesc Stores only ducks specified by the `duckModel`
 */
export class DuckRack extends EventEmitter {
  constructor (name, {
    duckModel,
    events = {},
    methods = {},
    idType = 'ObjectId' // ObjectId || uuid
  } = {}) {
    if (!name) {
      throw new Error('A name must be provided for a DuckRack')
    }

    super()
    this.idType = idType
    this.store = []
    this.storeKey = Object.create(null)
    this.duckModel = duckModel
    this._methods = methods
    this.events = events
    this.name = name

    this.hooks = new Hooks()

    this.trigger = this.hooks.trigger.bind(this.hooks, this)
    this.hook = this.hooks.hook.bind(this.hooks)

    const $this = this

    // DuckStorage.registerRack(this)

    this._proxy = new Proxy(this, {
      get (target, key) {
        if (target[key]) {
          return target[key]
        }
        if ($this.methods[key]) {
          return async (...payload) => {
            const inputValidation = $this.methods[key].input ? Schema.ensureSchema($this.methods[key].input) : undefined
            const outputValidation = $this.methods[key].output ? Schema.ensureSchema($this.methods[key].output) : undefined

            if (inputValidation && payload.length > 1) {
              throw new DuckRackError(`Only one argument expected at method ${key}`)
            }

            const input = inputValidation ? [await inputValidation.parse(payload[0])] : payload

            try {
              const result = await $this.methods[key].handler.call($this, ...input)
              return outputValidation ? await outputValidation.parse(result) : result
            } catch (err) {
              throw new DuckRackError(err.message, err)
            }
          }
        }
      }
    })

    return this.init()
  }

  /**
   * Initializes all duck async ops
   * @return {Promise<*>}
   */
  async init () {
    this.methods = await Methods.parse(this._methods)

    return this._proxy
  }

  async dispatch (eventName, payload) {
    const eventKey = camelCase(eventName)
    eventName = kebabCase(eventName)
    try {
      this.emit(kebabCase(eventName), await this.events[eventKey].parse(payload))
    } catch (err) {
      throw new EventError(`${eventName} payload is not valid`)
    }
  }

  get schema () {
    return this.duckModel.schema
  }

  static runQuery (entity, query) {
    return entity.filter(sift(query))
  }

  /**
   * Retrieves document by `id` and executes given `method` if found, with given payload. Saves the state of the entry
   * once done
   *
   * @param id
   * @param {String} method
   * @param {Object} state
   * @param {Number} _v - dot notation path
   * @param {String} path - dot notation path
   * @param {*} payload
   * @return {Promise<*>}
   */
  async apply ({ id, _v, path = null, method, payload, state = {} }) {
    await this.trigger('before', 'apply', { id, _v, method, path, payload, state })

    const query = _v ? {
      _id: {
        $eq: id
      },
      _v: {
        $eq: _v
      }
    } : id

    const doc = (await this.find(query))[0]

    if (!doc) {
      throw new Error('document not found')
    }

    let error
    let methodResult
    let entryResult

    const trapEvents = (entry) => {
      const trapped = []
      return {
        get trapped () {
          return trapped
        },
        dispatch (dispatcher) {
          trapped.forEach(({ event, payload }) => {
            dispatcher.emit('method', {
              event,
              path,
              entry,
              payload
            })
          })
        },
        trap (event) {
          entry.$on(event, (...payload) => {
            trapped.push({
              event,
              payload
            })
          })
        }
      }
    }

    const methods = (path ? this.duckModel.schema.schemaAtPath(path) : this.duckModel.schema)._methods
    const methodEvents = methods[method].events || {}
    const docAtPath = (path ? Utils.find(doc, path) : doc)

    const eventTrapper = trapEvents(docAtPath)

    Object.keys(methodEvents).forEach(eventTrapper.trap)

    try {
      methodResult = await docAtPath[method](payload)
    } catch (err) {
      error = new MethodError(err.message)
    }

    try {
      entryResult = (await this.update(id, doc, state))[0]
      eventTrapper.dispatch(this)
    } catch (err) {
      error = err
    }
    await this.trigger('after', 'apply', { id, _v, method, payload, state, error, methodResult, entryResult, eventsTrapped: eventTrapper.trapped })

    if (error) {
      throw error
    }

    return { methodResult, entryResult, eventsDispatched: eventTrapper.trapped }
  }

  /**
   * @event DuckRack#create
   * @type {Object} - the duck
   */

  /**
   * @param newEntry
   * @param {Object} state - hooks state
   * @return {Promise<*>}
   * @fires {DuckRack#create}
   */

  async create (newEntry = {}, state = {}) {
    if (typeof newEntry !== 'object' || newEntry === null || Array.isArray(newEntry)) {
      throw new Error('An entry must be provided')
    }

    DuckRack.validateEntryVersion(newEntry)

    const { store, storeKey } = this

    /*
    if (newEntry._id && await this.entryExists(newEntry._id)) {
      throw new Error(`Entry ${newEntry._id} already exists`)
    }
*/

    const entry = await this.schema.parse(newEntry, { state: { method: 'create' }, virtualsEnumerable: false })

    await this.trigger('before', 'create', { entry, state })

    storeKey[entry._id] = entry
    store.push(entry)

    const entryModel = await this.duckModel.getModel(entry)

    const createdEntry = await entryModel.consolidate()
    await this.trigger('after', 'create', { entry: createdEntry, state })
    this.emit('create', createdEntry)

    return createdEntry
  }

  /**
   * Sugar for `find(entityName, { _id: { $eq: _id } })`
   * @param _id
   * @param {Object} state - hooks state
   * @return {Promise<*>}
   */
  async read (_id, state = {}) {
    const entry = await this.findOneById(_id)
    if (entry) {
      await this.trigger('before', 'read', { entry, state })
      const recoveredEntry = await this.duckModel.schema.parse(cloneDeep(entry))
      await this.trigger('after', 'read', { entry: recoveredEntry, state })

      return recoveredEntry
    }
  }

  /**
   * @event DuckRack#update
   * @type {Object}
   * @property {Object} oldEntry - the entry as it was in previous state
   * @property {Object} newEntry - received patching object
   * @property {Object} entry - the resulting object
   */

  /**
   * Updates ducks matching given `query` with given `newEntry`
   * @fires {DuckRack#update}
   */

  async update (query, newEntry, state = {}) {
    const entries = (await this.find(query, {}, true)).map(oldEntry => {
      if (newEntry && newEntry._id && oldEntry._id !== newEntry._id) {
        throw new Error('_id\'s cannot be modified')
      }

      if (newEntry._v && newEntry._v !== oldEntry._v) {
        throw new Error('Entry version mismatch')
      }

      return oldEntry
    })

    for (const oldEntry of entries) {
      const entry = await this.schema.parse(Object.assign(cloneDeep(oldEntry), newEntry), { state: { method: 'update', oldEntry } })

      if (!objectHasBeenModified(oldEntry, entry)) {
        continue
      }

      entry._v = oldEntry._v + 1

      await this.trigger('before', 'update', { oldEntry, newEntry, entry, state })
      this.emit('update', { oldEntry: Object.assign({}, oldEntry), newEntry, entry })
      Object.assign(oldEntry, entry)
      await this.trigger('after', 'update', { oldEntry, newEntry, entry, state })
    }

    return entries
  }

  /**
   * @event DuckRack#delete
   * @type {Object}
   * @property {Object} oldEntry - the entry as it was in previous state
   * @property {Object} newEntry - received patching object
   * @property {Object} entry - the resulting object
   */

  /**
   * Deletes ducks matching given `query`
   * @fires {DuckRack#delete}
   */

  async delete (query, state = {}) {
    const entity = this.store
    const removedEntries = entity.filter(sift(query))

    for (const entry of removedEntries) {
      await this.trigger('before', 'delete', { entry, state })
      this.deleteById(entry._id)
      this.emit('delete', entry)
      await this.trigger('after', 'delete', { entry, state })
    }

    return removedEntries
  }

  deleteById (_id) {
    this.validateId(_id)
    let foundIndex = null

    forEach(this.store, (item, i) => {
      if (item._id === _id) {
        foundIndex = i
        return false
      }
    })

    const foundEntry = this.storeKey[_id]

    if (foundEntry) {
      delete this.storeKey[_id]
    }

    if (foundIndex !== null) {
      this.store.splice(foundIndex, 1)
    }
  }

  async list (query, sort) {
    const entries = await Promise.map(query ? await this.find(query) : this.store, async value => {
      const entry = await this.duckModel.getModel(value)
      const foundEntry = await entry.consolidate()
      return foundEntry
    })

    if (!sort) {
      return entries
    }

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

    return sortArray(entries, sort)
  }

  validateId () {
    // todo: validate id type / value
    return true
  }

  async entryExists (_id) {
    this.validateId(_id)
    return this.storeKey[_id] !== undefined
  }

  async findOneById (_id, state = {}, raw) {
    await this.trigger('before', 'findOneById', { _id, state })

    const queryInput = {
      _id: {
        $eq: _id
      }
    }

    const theQuery = await Query.parse(queryInput)

    // cloneDeep is meant to prevent the memory store object being mutated
    const result = cloneDeep((await DuckRack.runQuery(this.store, theQuery))[0])

    await this.trigger('after', 'findOneById', { _id, result })
    return result
  }

  async find (queryInput, state = {}, raw = false) {
    // todo: run hooks
    if (typeof queryInput !== 'object') {
      queryInput = {
        _id: {
          $eq: queryInput
        }
      }
    }

    return Promise.map(DuckRack.runQuery(this.store, await Query.parse(queryInput)), obj => raw ? obj : this.duckModel.schema.parse(cloneDeep(obj)))
  }

  static validateEntryVersion (newEntry, oldEntry) {
    if (!newEntry || typeof newEntry !== 'object' || Array.isArray(newEntry)) {
      throw new Error('Entry must be an object')
    }

    if (Object.prototype.hasOwnProperty.call(newEntry, '_v') && typeof newEntry._v !== 'number') {
      throw new Error('Invalid entry version')
    }

    // oldEntry._v > newEntry._d => version mismatch
    if (oldEntry && newEntry._v && oldEntry._v > newEntry._v) {
      throw new Error('Entry version mismatch')
    }
  }
}
