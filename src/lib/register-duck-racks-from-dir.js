import { jsDirIntoJson } from 'js-dir-into-json'
import { registerDuckRacksFromObj } from './register-duck-racks-from-obj'

export async function registerDuckRacksFromDir (directory) {
  return registerDuckRacksFromObj(await jsDirIntoJson(directory, {
    extensions: ['!lib', '!__tests__', '!*.unit.js', '!*.test.js', '*.js', '*.mjs']
  }))
}
