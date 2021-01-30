import { jsDirIntoJson } from 'js-dir-into-json'
import { registerDuckRacksFromObj } from './register-duck-racks-from-obj'

export async function registerDuckRacksFromDir (duckStorage, directory) {
  return registerDuckRacksFromObj(duckStorage, await jsDirIntoJson(directory, {
    extensions: ['!lib', '!__tests__', '!*.unit.js', '!*.spec.js', '!*.test.js', '*.js', '*.mjs']
  }))
}
