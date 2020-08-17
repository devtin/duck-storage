import { jsDirIntoJson } from 'js-dir-into-json'
import { Schema } from 'duckfficer'
import { DuckStorage } from './duck-storage'
import { DuckRack } from './duck-rack'
import { Duck } from './duck'

export async function registerDuckRacksFromDir (directory) {
  const racks = await jsDirIntoJson(directory)
  Object.keys(racks).forEach((rackName) => {
    const { duckModel, methods } = racks[rackName]
    const schema = new Schema(duckModel.schema, { methods: duckModel.methods })
    const duckRack = new DuckRack(rackName, { duckModel: new Duck({ schema }), methods })
    DuckStorage.registerRack(duckRack)
  })
  return racks
}
