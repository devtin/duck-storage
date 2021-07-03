import InMemory from './lib/plugins/in-memory-db.js'
import HashPassword from './lib/plugins/hash-password.js'
export { DuckStorageClient } from './lib/duck-storage-client.js'
export { DuckStorageClass } from './lib/duck-storage.js'
export { DuckRack } from './lib/duck-rack.js'
export { Duck } from './lib/duck.js'
export { registerDuckRacksFromDir } from './lib/register-duck-racks-from-dir.js'
export { registerDuckRacksFromObj } from './lib/register-duck-racks-from-obj.js'
export * as Duckfficer from 'duckfficer'

export const plugins = {
  InMemory,
  HashPassword
}
