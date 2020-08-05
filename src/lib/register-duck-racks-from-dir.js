import { jsDirIntoJson } from 'js-dir-into-json'
import { DuckStorage } from './duck-storage'
import { DuckRack } from './duck-rack'
import { Duck } from './duck'

export async function registerDuckRacksFromDir (directory) {
  const racks = await jsDirIntoJson(directory)
  Object.keys(racks).forEach((rackName) => {
    const duckModelSchema = racks[rackName]
    const duckRack = new DuckRack(rackName, { duckModel: new Duck(duckModelSchema) })
    DuckStorage.registerRack(duckRack)
  })
  return racks
}
