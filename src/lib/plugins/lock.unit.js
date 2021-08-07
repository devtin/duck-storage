import test from 'ava'
import { handler as LockPlugin } from './lock'

const getFake = ({ lockTimeout = 10 } = {}) => {
  const duckRack = {
    hooks: {},
    hook (ev, id, cb) {
      this.hooks[`${ev}:${id}`] = cb
    },
    trigger (ev, id, payload, rollback = []) {
      return this.hooks[`${ev}:${id}`](payload, rollback)
    }
  }

  LockPlugin({
    lockTimeout
  })({ duckRack })

  return duckRack
}

const fakeId = '123'

test('before::update - locks _id', async t => {
  const duckRack = getFake()
  await duckRack.trigger('before', 'update', { oldEntry: { _id: fakeId } })
  t.true(duckRack.isLocked(fakeId))
})

test('before::update - provides unlock rollback strategy', async t => {
  const duckRack = getFake()
  const rollback = []
  await duckRack.trigger('before', 'update', { oldEntry: { _id: fakeId } }, rollback)
  t.is(rollback.length, 1)
  t.true(duckRack.isLocked(fakeId))
  rollback[0]()
  t.false(duckRack.isLocked(fakeId))
})

test('before::delete - locks _id', async t => {
  const duckRack = getFake()
  await duckRack.trigger('before', 'delete', { entry: { _id: fakeId } })
  t.true(duckRack.isLocked(fakeId))
})

test('before::delete - provides unlock rollback strategy', async t => {
  const duckRack = getFake()
  const rollback = []
  await duckRack.trigger('before', 'delete', { entry: { _id: fakeId } }, rollback)
  t.is(rollback.length, 1)
  t.true(duckRack.isLocked(fakeId))
  await rollback[0]()
  t.false(duckRack.isLocked(fakeId))
})

test('after::update - unlocks _id', async t => {
  const duckRack = getFake()
  await duckRack.lock(fakeId)
  await duckRack.trigger('after', 'update', { oldEntry: { _id: fakeId } })
  t.false(duckRack.isLocked(fakeId))
})

test('after::delete - unlocks _id', async t => {
  const duckRack = getFake()
  await duckRack.lock(fakeId)
  await duckRack.trigger('after', 'delete', { entry: { _id: fakeId } })
  t.false(duckRack.isLocked(fakeId))
})

test('time-out when entry already locked after lockTimeout', async t => {
  const duckRack = getFake({
    lockTimeout: 1
  })
  await duckRack.lock(fakeId)
  const err1 = await t.throwsAsync(() => duckRack.trigger('before', 'update', { oldEntry: { _id: fakeId } }))
  const err2 = await t.throwsAsync(() => duckRack.trigger('before', 'delete', { entry: { _id: fakeId } }))

  t.is(err1.message, `lock time-out for _id ${fakeId}`)
  t.is(err2.message, `lock time-out for _id ${fakeId}`)
})
