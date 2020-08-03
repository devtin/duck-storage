import { EventEmitter } from 'events'
import { Utils, Schema } from '@devtin/schema-validator'
import sift from 'sift'
import camelCase from 'lodash/camelCase'
import kebabCase from 'lodash/kebabCase'

import './types/object-id.js'
import './types/uuid.js'
import './types/query.js'
import { Methods } from './schemas/method.js'
import { DuckStorage } from './duck-storage'
import { Hooks } from './hooks'

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
    this.methods = Methods.parse(methods)
    this.events = events
    this.name = name

    this.hooks = new Hooks()

    this.trigger = this.hooks.trigger.bind(this.hooks, this)
    this.hook = this.hooks.hook.bind(this.hooks)

    const $this = this

    DuckStorage.registerRack(this)

    return new Proxy(this, {
      get (target, key) {
        if (target[key]) {
          return target[key]
        }
        if ($this.methods[key]) {
          return (...payload) => {
            const inputValidation = $this.methods[key].input ? Schema.ensureSchema($this.methods[key].input) : undefined
            const outputValidation = $this.methods[key].output ? Schema.ensureSchema($this.methods[key].output) : undefined

            if (inputValidation && payload.length > 1) {
              throw new DuckRackError(`Only one argument expected at method ${key}`)
            }

            const input = inputValidation ? [inputValidation.parse(payload[0])] : payload

            try {
              const result = $this.methods[key].handler.call($this, ...input)
              return outputValidation ? outputValidation.parse(result) : result
            } catch (err) {
              throw new DuckRackError(err.message, err)
            }
          }
        }
      }
    })
  }

  dispatch (eventName, payload) {
    const eventKey = camelCase(eventName)
    eventName = kebabCase(eventName)
    try {
      this.emit(kebabCase(eventName), this.events[eventKey].parse(payload))
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

  async create (newEntry = {}) {
    newEntry = await this.trigger('before', 'create', newEntry)

    if (typeof newEntry !== 'object' || newEntry === null || Array.isArray(newEntry)) {
      throw new Error('An entry must be provided')
    }

    DuckRack.validateEntryVersion(newEntry)

    const { store, storeKey } = this

    if (newEntry._id && await this.entryExists(newEntry._id)) {
      throw new Error(`Entry ${newEntry._id} already exists`)
    }

    const entry = this.schema.parse(newEntry, { state: { method: 'create' } })
    storeKey[entry._id] = entry
    store.push(entry)

    const entryModel = await this.trigger('after', 'create', this.duckModel.getModel(entry))
    this.emit('create', entryModel)

    return entryModel
  }

  /**
   * Sugar for `find(entityName, { _id: { $eq: _id } })`
   * @param _id
   * @return {Promise<*>}
   */
  async read (_id) {
    const entry = await this.findOneById(_id)
    if (entry) {
      const entryModel = this.duckModel.getModel(Object.assign({}, entry))
      return this.trigger('after', 'read', entryModel)
    }
  }

  async update (query, newEntry) {
    const entries = (await DuckRack.find(this.store, query)).map(oldEntry => {
      if (newEntry && newEntry._id && oldEntry._id !== newEntry._id) {
        throw new Error('_id\'s can not be modified')
      }

      if (newEntry._v && newEntry._v !== oldEntry._v) {
        throw new Error('Entry version mismatch')
      }

      return oldEntry
    })

    for (const oldEntry of entries) {
      const entry = Object.assign({}, oldEntry, newEntry, { _v: oldEntry._v + 1 })
      await this.trigger('before', 'update', { oldEntry, newEntry, entry })
      this.emit('update', { oldEntry: Object.assign({}, oldEntry), newEntry, entry })
      Object.assign(oldEntry, entry)
    }

    return entries
  }

  async delete (query) {
    const entity = this.store
    const removedEntries = entity.filter(sift(query))

    for (const entry of removedEntries) {
      await this.trigger('before', 'remove', entry)
      this.deleteById(entry._id)
      this.emit('delete', entry)
      await this.trigger('after', 'remove', entry)
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

  async list (query) {
    return (query ? await DuckRack.find(this.store, query) : this.store).map(value => {
      return this.duckModel.getModel(value)
    })
  }

  validateId () {
    // todo: validate id type / value
    return true
  }

  async entryExists (_id) {
    this.validateId(_id)
    return this.storeKey[_id] !== undefined
  }

  async findOneById (_id) {
    const queryInput = {
      _id: {
        $eq: _id
      }
    }
    return (await DuckRack.runQuery(this.store, Query.parse(queryInput)))[0]
  }

  static async find (store, queryInput) {
    if (typeof queryInput !== 'object') {
      queryInput = {
        _id: {
          $eq: queryInput
        }
      }
    }

    return DuckRack.runQuery(store, Query.parse(queryInput))
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
