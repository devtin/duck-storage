import { Schema } from 'duckfficer'
import { DuckStorage } from './duck-storage'
import { DuckRack } from './duck-rack'
import { Duck } from './duck'
/**
 * Register multiple DuckModels at once in DuckRack's
 * @param {Object} duckRacks - an object mapping Duck's
 * @return {DuckRack[]}
 */
export function registerDuckRacksFromObj (duckRacks) {
  return Object.keys(duckRacks).map((rackName) => {
    const { duckModel, methods } = duckRacks[rackName]
    const schema = new Schema(duckModel.schema, { methods: duckModel.methods })
    const duckRack = new DuckRack(rackName, { duckModel: new Duck({ schema }), methods })
    return DuckStorage.registerRack(duckRack)
  })
}
