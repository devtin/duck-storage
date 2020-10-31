import test from 'ava'
import { DuckStorage } from './duck-storage'
import { DuckRack } from './duck-rack'
import { Duck } from './duck'

test('serializes duck-rack requests when locked', async t => {
  const user = await new DuckRack('user', {
    duckModel: new Duck({
      schema: {
        firstName: String,
        lastName: String
      }
    })
  })
  await DuckStorage.registerRack(user)
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
