import test from 'ava'
import { DuckStorageClient } from './duck-storage-client.js'
import { fork } from 'child_process'
import faker from 'faker'

let DuckStorage
let mainDuckStorageProcess

const forkMain = (file) => {
  mainDuckStorageProcess = fork(file)
  return new Promise((resolve, reject) => {
    mainDuckStorageProcess.on('message', (message) => {
      if (message === 'done') {
        resolve()
      }
    })

    setTimeout(() => reject(new Error('timed-out')), 3000)
  })
}

test.before(async (t) => {
  await forkMain('test/fixtures/forks/duck-storage-main.js')

  // fork main
  DuckStorage = await new DuckStorageClient({
    clientId: 'client'
  })
})

test.after(async (t) => {
  await DuckStorage.disconnect()

  mainDuckStorageProcess.kill()
})

test('connects to main', async (t) => {
  const userData = {
    firstName: 'Juanito',
    lastName: 'Alimaña'
  }

  const user = await DuckStorage.users.create(userData)

  t.log({ user })
  t.like(user, userData)
  t.truthy(user._id)
  t.truthy(user._v)
  t.is(user.fullName, `${userData.firstName} ${userData.lastName}`)
})

test('lists racks', async (t) => {
  const racks = await DuckStorage.listRacks()
  t.log(racks)
  t.is(racks.length, 1)
})

test('speed', async (t) => {
  const entries = (new Array(1000)).fill(undefined).map(() => {
    return {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    }
  })

  const start = Date.now()
  await Promise.all(entries.map((entry) => {
    return DuckStorage.users.create(entry)
  }))
  t.log('finished in', Date.now() - start)
  t.true((await DuckStorage.users.list()).length >= 1000)
})
