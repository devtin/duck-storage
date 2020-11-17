import { EventEmitter } from 'events'
import { Utils, Schema } from 'duckfficer'
import camelCase from 'lodash/camelCase'
import kebabCase from 'lodash/kebabCase'
import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import { detailedDiff } from 'deep-object-diff'
import Promise from 'bluebird'
import ObjectId from 'bson-objectid'

import './types/sort'
import './types/password'
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

  /**
   * Retrieves document by `id` and executes given `method` if found, with given payload. Saves the state of the entry
   * once done
   *
   * @param id
   * @param {String} method
   * @param {Object} state
   * @param {Number} _v - dot notation path
   * @param {String} path - dot notation path
   * @param {Function} validate - validator function that receives the document
   * @param {*} payload
   * @return {Promise<*>}
   */
  async apply ({ id, _v, path = null, method, payload, state = {}, validate }) {
    Object.assign(state, {
      method: 'apply'
    })

    const getQuery = () => {
      if (_v) {
        return {
          _id: ObjectId(id),
          _v: {
            $eq: _v
          }
        }
      }
      return id
    }

    await this.trigger('before', 'apply', { id, _v, method, path, payload, state })

    const query = getQuery()

    const doc = (await this.find(query))[0]

    if (!doc) {
      throw new Error('document not found')
    }

    if (validate) {
      // custom doc validation
      await validate(doc)
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
      methodResult = await docAtPath[method](payload, { state })
    } catch (err) {
      error = new MethodError(err.message)
    }

    try {
      entryResult = (await this.update(id, get(doc, this.duckModel.schema.ownPaths), state))[0]
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

    Object.assign(state, {
      method: 'create'
    })

    DuckRack.validateEntryVersion(newEntry)

    const entry = await this.schema.parse(newEntry, { state, virtualsEnumerable: false })

    Object.assign(state, {
      entryProcessed: false
    })

    await this.trigger('before', 'create', { entry, state })
    const entryModel = await this.duckModel.getModel(entry, state)
    const createdEntry = await entryModel.consolidate()
    await this.trigger('after', 'create', { entry: createdEntry, state })
    this.emit('create', { entry: createdEntry, state })

    return createdEntry
  }

  /**
   * Sugar for `find(entityName, { _id: { $eq: _id } })`
   * @param _id
   * @param {Object} state - hooks state
   * @return {Promise<*>}
   */
  async read (_id, state = {}) {
    Object.assign(state, {
      method: 'read'
    })

    const entry = await this.findOneById(_id)
    if (entry) {
      await this.trigger('before', 'read', { entry, state })
      const recoveredEntry = await this.duckModel.schema.parse(cloneDeep(entry), {
        state
      })
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
    Object.assign(state, {
      method: 'update'
    })

    const entries = (await this.find(query, state, true)).map(oldEntry => {
      if (newEntry && newEntry._id && !ObjectId(oldEntry._id).equals(newEntry._id)) {
        throw new Error('_id\'s cannot be modified')
      }

      if (newEntry && newEntry._v && newEntry._v !== oldEntry._v) {
        throw new Error('Entry version mismatch')
      }

      return oldEntry
    })

    const newEntries = []

    for (const oldEntry of entries) {
      Object.assign(state, { oldEntry })
      const composedNewEntry = Object.assign(cloneDeep(oldEntry), newEntry)

      const entry = await this.schema.parse(composedNewEntry, { state })

      if (!objectHasBeenModified(oldEntry, entry)) {
        newEntries.push(oldEntry)
        continue
      }

      newEntry._v = entry._v = oldEntry._v + 1
      const result = []

      await this.trigger('before', 'update', { oldEntry, newEntry, entry, state, result })
      this.emit('update', { oldEntry, newEntry, entry })
      await this.trigger('after', 'update', { oldEntry, newEntry, entry, state, result })

      if (result.length > 0) {
        newEntries.push(...result)
      }
    }

    return Promise.map(newEntries, entry => this.schema.parse(entry))
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
    Object.assign(state, {
      method: 'delete'
    })

    await this.trigger('before', 'deleteMultiple', { query, state })

    const entriesToRemove = await this.find(query)
    const removedEntries = []

    for (const entry of entriesToRemove) {
      if (await this.deleteById(entry._id)) {
        removedEntries.push(entry)
        this.emit('delete', entry)
      }
    }

    await this.trigger('after', 'deleteMultiple', { query, result: removedEntries, state })

    return removedEntries
  }

  async deleteById (_id, state = {}) {
    this.validateId(_id)
    Object.assign(state, {
      method: 'deleteById'
    })

    const result = []

    await this.trigger('before', 'deleteById', { _id, state, result })
    await this.trigger('after', 'deleteById', { _id, state, result })

    return result[0]
  }

  consolidateDoc (state) {
    return async (doc) => {
      const entry = await this.duckModel.getModel(doc, state)
      return entry.consolidate({ virtualsEnumerable: true })
    }
  }

  async list (query, sort, state = {}) {
    Object.assign(state, {
      method: 'list'
    })

    const entries = await this.find(query, state)

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

  async findOneById (_id, state = {}, raw = false) {
    Object.assign(state, {
      method: 'findOneById'
    })

    const queryInput = {
      _id: ObjectId(_id)
    }

    const result = []

    // todo: remove before / after states as they may not be needed any more
    await this.trigger('before', 'findOneById', { _id, queryInput, state, result })

    await this.trigger('after', 'findOneById', { _id, queryInput, result, state })
    return result[0]
  }

  // todo: add limits
  async find (queryInput = {}, state = {}, raw = false) {
    Object.assign(state, {
      method: 'find'
    })

    // todo: run hooks
    if (ObjectId.isValid(queryInput)) {
      queryInput = {
        _id: ObjectId(queryInput)
      }
    }

    const result = []

    await this.trigger('before', 'find', { query: queryInput, raw, state, result })
    await this.trigger('after', 'find', { query: queryInput, raw, state, result })

    return raw ? result : Promise.map(result, this.consolidateDoc(state))
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
