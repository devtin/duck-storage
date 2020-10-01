import { Schema } from 'duckfficer'
import { DuckStorage } from './duck-storage'
import { DuckRack } from './duck-rack'
import { Duck } from './duck'
import Promise from 'bluebird'

/**
 * Register multiple DuckModels at once in DuckRack's
 * @param {Object} duckRacks - an object mapping Duck's
 * @return {DuckRack[]}
 */
export async function registerDuckRacksFromObj (duckRacks) {
  return Promise.map(Object.keys(duckRacks), async (rackName) => {
    const { duckModel, methods } = duckRacks[rackName]

    const schema = duckModel instanceof Schema ? duckModel : new Schema(duckModel.schema, { methods: duckModel.methods || {} })
    const duckRack = await new DuckRack(rackName, { duckModel: new Duck({ schema }), methods })
    return DuckStorage.registerRack(duckRack)
  })
}
