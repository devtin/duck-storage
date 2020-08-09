import loadReference from './plugins/load-reference'
import { EventEmitter } from 'events'

export class DuckStorageClass extends EventEmitter {
  constructor () {
    super()
    this.store = Object.create(null)
    this.plugins = [loadReference]
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
  }

  init () {

  }

  plugin (fn) {
    this.plugins.push(fn)
  }

  registerRack (duckRack) {
    if (this.store[duckRack.name]) {
      throw new Error(`a DuckRack with the name ${duckRack.name} is already registered`)
    }

    this.store[duckRack.name] = duckRack
    this.plugins.forEach(fn => {
      fn({ DuckStorage, duckRack })
    })
    this._wireRack(duckRack)
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
