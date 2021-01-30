import test from 'ava'
import inMemory from './plugins/in-memory-db.js'
import { DuckStorageClass } from './duck-storage'
import { DuckRack } from './duck-rack'
import { Duck } from './duck'
import faker from 'faker'

let DuckStorage

test.before(async () => {
  DuckStorage = await new DuckStorageClass({
    plugins: [inMemory()]
  })

  const user = await new DuckRack('user', {
    duckModel: new Duck({
      schema: {
        firstName: String,
        lastName: String
      }
    })
  })
  await DuckStorage.registerRack(user)
})

test('serializes duck-rack requests when locked', async t => {
  const user = DuckStorage.getRackByName('user')
  const martin = await user.create({
    firstName: 'Martin',
    lastName: 'Gonzalez'
  })
  t.truthy(martin)
  await user.lock(martin._id)
  const update = []
  update.push(user.update(martin._id, { lastName: 'Antonio' }))
  update.push(user.update(martin._id, { lastName: 'Jose' }))
  update.push(user.update(martin._id, { lastName: 'Rafael' }))

  setTimeout(() => {
    user.unlock(martin._id)
  }, 300)

  await Promise.all(update)
  t.is((await user.read(martin._id)).lastName, 'Rafael')
})

test.only('speed', async (t) => {
  const entries = (new Array(1000)).fill(undefined).map(() => {
    return {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    }
  })

  const start = Date.now()
  const userRack = DuckStorage.getRackByName('user')

  await Promise.all(entries.map((entry) => {
    return userRack.create(entry)
  }))
  t.log('finished in', Date.now() - start)
  t.true((await userRack.list()).length >= 1000)
})
