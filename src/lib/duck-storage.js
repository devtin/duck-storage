import loadReference from './plugins/load-reference'

const store = Object.create(null)
const plugins = [loadReference]
export const DuckStorage = {
  plugin (fn) {
    plugins.push(fn)
  },
  registerRack (duckRack) {
    if (store[duckRack.name]) {
      throw new Error(`a DuckRack with the name ${duckRack.name} is already registered`)
    }

    store[duckRack.name] = duckRack
    plugins.forEach(fn => {
      fn({ DuckStorage, duckRack })
    })
  },
  removeRack (rackName) {
    if (!store[rackName]) {
      throw new Error(`a DuckRack with the name ${rackName} could not be found`)
    }

    delete store[rackName]
  },
  listRacks () {
    return Object.keys(store)
  },
  getRackByName (rackName) {
    return store[rackName]
  }
}
