import { Schema, Utils } from 'duckfficer'
import ipc from 'node-ipc'
import { EventEmitter } from 'events'
import { getAppName } from './get-app-name.js'
import lock from './plugins/lock'
import loadReference from './plugins/load-reference'
import { Duck } from './duck'
import { DuckRack } from './duck-rack'
const { PromiseEach } = Utils

const resolveValue = async (value) => {
  if (typeof value === 'function') {
    return value()
  }

  return value
}

const isFn = (f) => typeof f === 'function'

export class DuckStorageClass extends EventEmitter {
  constructor ({
    appName = getAppName,
    plugins = [],
    setupIpc = true
  } = {}) {
    super()
    this.store = Object.create(null)
    this.plugins = [loadReference, /* uniqueKeys, */lock()].concat(plugins)

    // todo: implement event's store
    // todo: implement error's store
    return (async () => {
      this.eventsRack = await new DuckRack('$events', {
        duckModel: new Duck({
          schema: new Schema({
            rack: String,
            event: String,
            payload: Object,
            date: Date
          })
        })
      })

      this.errorsRack = await new DuckRack('$errors', {
        duckModel: new Duck({
          schema: new Schema({
            rack: String,
            message: String,
            payload: Object,
            date: Date
          })
        })
      })

      if (setupIpc) {
        await this.setupIpc(appName)
      }

      return this
    })()
  }

  async setupIpc (appName) {
    const appspace = await resolveValue(appName)

    Object.assign(ipc.config, {
      appspace,
      id: 'duck-storage',
      silent: true
    })

    return new Promise((resolve, reject) => {
      ipc.serve(resolve)
      ipc.server.on('error', reject)
      setTimeout(() => reject(new Error('ipc time out')), 5000)
      ipc.server.start()
      this.ipc = ipc.server

      // handler
      ipc.server.on('storage', (data, socket) => {
        const answer = ({ error, result }) => {
          this.ipc.emit(
            socket,
            data.id,
            {
              error,
              result
            }
          )
        }
        const executeAndAnswer = (promiseOrValue) => {
          return Promise
            .resolve(promiseOrValue)
            .then(result => {
              answer({
                result
              })
            })
            .catch((error) => {
              answer({
                error: error.message
              })
            })
        }
        const [rackName, rackMethod] = data.path

        if (!rackName) {
          return answer({ error: 'rackName is required' })
        }

        if (!rackMethod && isFn(this[rackName])) {
          return executeAndAnswer(this[rackName](...data.args))
        }

        if (!rackMethod) {
          return answer({ error: 'rackMethod is required' })
        }

        const rack = this.getRackByName(rackName)

        if (!rack) {
          return answer({ error: `rack "${rackName}" not found` })
        }

        if (!isFn(rack[rackMethod])) {
          return answer({ error: `method ${rackMethod} not found in rack ${rackName}` })
        }

        executeAndAnswer(rack[rackMethod](...data.args))
      })
    })
  }

  logEvent (eventName, { rack, payload }) {
    this.eventsRack
      .create({
        rack: rack.name,
        event: eventName,
        payload,
        date: Date.now()
      })
      .catch(() => {
        // todo: log using logger
      })
  }

  _wireRack (rack) {
    rack.on('create', (payload) => {
      this.logEvent('create', { rack, payload })

      this.emit('create', {
        entityName: rack.name,
        payload
      })
    })

    rack.on('read', (payload) => {
      this.logEvent('read', { rack, payload })

      this.emit('read', {
        entityName: rack.name,
        payload
      })
    })

    rack.on('update', (payload) => {
      this.logEvent('update', { rack, payload })

      this.emit('update', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('delete', (payload) => {
      this.logEvent('delete', { rack, payload })

      this.emit('delete', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('list', (payload) => {
      this.logEvent('list', { rack, payload })

      this.emit('list', {
        entityName: rack.name,
        payload
      })
    })
    rack.on('method', (payload) => {
      this.logEvent('method', { rack, payload })

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
