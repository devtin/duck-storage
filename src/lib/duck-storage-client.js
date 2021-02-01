import DeepProxy from 'proxy-deep'
import ipc from 'node-ipc'
import { getAppName } from './get-app-name.js'
import { uuid } from './types/uuid.js'

const ipcConnect = async ({ appSpace, clientId }) => {
  Object.assign(ipc.config, {
    appspace: appSpace || await getAppName(),
    id: clientId,
    silent: true
  })

  return new Promise((resolve, reject) => {
    ipc.connectTo('duck-storage', () => {
      resolve(ipc.of['duck-storage'])
    })
  })
}

const ipcDisconnect = async () => {
  return new Promise((resolve, reject) => {
    ipc.of['duck-storage'].on('disconnect', resolve)
    setTimeout(() => reject(new Error('ipc disconnec time-dout')), 3000)
    ipc.disconnect('duck-storage')
  })
}

export class DuckStorageClient {
  constructor ({
    appSpace,
    clientId
  } = {}) {
    return (async () => {
      this.ipc = await ipcConnect({ appSpace, clientId })
      return this.proxy()
    })()
  }

  process ({ args, path }) {
    return new Promise((resolve, reject) => {
      const id = uuid()
      this.ipc.on(id, ({ error, result }) => {
        if (error) {
          return reject(error)
        }

        resolve(result)
      })
      this.ipc.emit('storage', {
        id,
        path,
        args
      })
    })
  }

  proxy () {
    const $this = this
    return new DeepProxy({}, {
      get (target, path, receiver) {
        if (path === 'then') {
          return
        }
        if (path === 'disconnect') {
          return ipcDisconnect
        }
        return this.nest(function () {})
      },
      apply (target, thisArg, args) {
        return $this.process({ args, path: this.path })
      }
    })
  }
}
