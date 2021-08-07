import { EventEmitter } from 'events'
import R from 'ramda'

const getLockSkip = R.path(['lock', 'skip'])
const isObj = v => {
  return typeof v === 'object' && !Array.isArray(v)
}
const notObj = R.compose(R.not, isObj)

const skipLock = R.cond([
  [notObj, R.F],
  [R.compose(R.isNil, getLockSkip), R.T],
  [R.T, getLockSkip]
])

const doLock = R.compose(R.not, skipLock)

export default function ({ lockTimeout = 3000 } = {}) {
  return {
    name: 'lock',
    handler: ({ duckRack }) => {
      const unlocked = new EventEmitter()
      const locked = new Set()
      const waitIfLocked = (_id, timeout) => {
        if (locked.has(_id)) {
          return new Promise((resolve, reject) => {
            unlocked.on(_id, resolve)
            setTimeout(() => reject(new Error(`lock time-out for _id ${_id}`)), timeout)
          })
        }
      }

      duckRack.lock = async (id, timeout = lockTimeout) => {
        if (locked.has(id)) {
          const init = Date.now()
          await waitIfLocked(id, timeout)
          const timeSpent = Date.now() - init
          return duckRack.lock(id, Math.max(timeout - timeSpent, 0))
        }
        locked.add(id)
      }

      duckRack.unlock = (_id) => {
        locked.delete(_id)
        unlocked.emit(_id)
      }

      duckRack.isLocked = (_id) => {
        return locked.has(_id)
      }

      duckRack.hook('before', 'apply', async ({ state }) => {
        Object.assign(state, {
          lock: {
            skip: true
          }
        })
      })

      duckRack.hook('before', 'create', async ({ entry, state }, rollback) => {
        const { _id } = entry
        if (doLock(state)) {
          await duckRack.lock(_id)
        }
        rollback.push(duckRack.unlock.bind(duckRack, _id))
      })

      duckRack.hook('before', 'update', async ({ oldEntry, newEntry, entry, state }, rollback) => {
        const { _id } = oldEntry
        if (doLock(state)) {
          await duckRack.lock(_id)
        }
        rollback.push(duckRack.unlock.bind(duckRack, _id))
      })

      duckRack.hook('after', 'update', async ({ oldEntry, newEntry, entry }) => {
        duckRack.unlock(oldEntry._id)
      })

      duckRack.hook('before', 'delete', async ({ entry, state }, rollback) => {
        const { _id } = entry
        if (doLock(state)) {
          await duckRack.lock(_id)
        }
        rollback.push(duckRack.unlock.bind(duckRack, _id))
      })

      duckRack.hook('after', 'delete', async ({ entry }) => {
        const { _id } = entry
        duckRack.unlock(_id)
      })
    }
  }
}
