const store = Object.create(null)
export const DuckStorage = {
  registerRack (duckRack) {
    if (store[duckRack.name]) {
      throw new Error(`a DuckRack with the name ${duckRack.name} is already registered`)
    }

    store[duckRack.name] = duckRack
  },
  getRackByName (rackName) {
    return store[rackName]
  }
}
