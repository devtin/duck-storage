import lock from './plugins/lock'
import loadReference from './plugins/load-reference'
import uniqueKeys from './plugins/unique-keys'
import { EventEmitter } from 'events'
import { DuckRack } from './duck-rack'
import { Utils } from 'duckfficer'

const { PromiseEach } = Utils

export class DuckStorageClass extends EventEmitter {
  constructor () {
    super()
    this.store = Object.create(null)
    this.plugins = [loadReference, uniqueKeys, lock()]
  }

  _wireRack (rack) {
    rack.on('create', (payload) => {
      this.emit('create', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('read', (payload) => {
      this.emit('read', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('update', (payload) => {
      this.emit('update', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('delete', (payload) => {
      this.emit('delete', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('list', (payload) => {
      this.emit('list', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('method', (payload) => {
      this.emit('method', {
        entityName: rack.name,
        payload
      })
    })
  }

  async init (name, model, { methods, events } = {}) {
    const duckRack = await new DuckRack(name, {
      duckModel: model,
      methods,
      events
    })
    await this.registerRack(duckRack)
    return duckRack
  }

  plugin (fn) {
    this.plugins.push(fn)
  }

  /**
   * Registers given DuckRack
   * @param {DuckRack} duckRack
   * @return {DuckRack}
   */
  async registerRack (duckRack) {
    // todo: how about makking this function async?
    if (this.store[duckRack.name]) {
      throw new Error(`a DuckRack with the name ${duckRack.name} is already registered`)
    }

    this.store[duckRack.name] = duckRack
    await PromiseEach(this.plugins, fn => {
      return fn({ DuckStorage: this, duckRack })
    })
    this._wireRack(duckRack)
    return duckRack
  }

  removeRack (rackName) {
    if (!this.store[rackName]) {
      throw new Error(`a DuckRack with the name ${rackName} could not be found`)
    }

    delete this.store[rackName]
  }

  listRacks () {
    return Object.keys(this.store)
  }

  getRackByName (rackName) {
    return this.store[rackName]
  }
}

export const DuckStorage = new DuckStorageClass()
