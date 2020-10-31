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
    const { duckModel: duckModelPayload, methods = {} } = duckRacks[rackName]
    const { schema: theSchema, methods: theMethods = {} } = duckModelPayload

    const getSchema = () => {
      if (theSchema instanceof Schema) {
        return theSchema
      }

      return new Schema(theSchema, {
        methods: theMethods
      })
    }

    const schema = getSchema()

    const duckModel = duckModelPayload instanceof Duck ? duckModelPayload : new Duck({ schema })
    const duckRack = await new DuckRack(rackName, { duckModel, methods })
    return DuckStorage.registerRack(duckRack)
  })
}
