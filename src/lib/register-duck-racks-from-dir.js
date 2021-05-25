import { jsDirIntoJson } from 'js-dir-into-json'
import { registerDuckRacksFromObj } from './register-duck-racks-from-obj'

export async function registerDuckRacksFromDir (duckStorage, directory, remap = (obj) => obj) {
  return registerDuckRacksFromObj(duckStorage, remap(await jsDirIntoJson(directory, {
    extensions: ['!lib', '!__tests__', '!*.unit.js', '!*.spec.js', '!*.test.js', '*.js', '*.mjs']
  })))
}
