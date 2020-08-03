import { jsDirIntoJson } from 'js-dir-into-json'
import { DuckRack } from './duck-rack'
import { Duck } from './duck'

export async function registerDuckRacksFromDir (directory) {
  const racks = await jsDirIntoJson(directory)
  Object.entries(racks).forEach((rackName, duckModelSchema) => {
    console.log({ duckModelSchema })
    DuckRack.register(rackName, new Duck(duckModelSchema))
  })
}
