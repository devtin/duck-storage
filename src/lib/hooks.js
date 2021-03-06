import { ErrorHook } from './error-hook'

export class Hooks {
  constructor () {
    this.hooks = []
  }

  hook (lifeCycle, hookName, cb) {
    this.hooks.push({ lifeCycle, hookName, cb })
  }

  async trigger (thisArg, lifeCycle, hookName, payload, rollback = []) {
    const hooksMatched = this
      .hooks
      .filter(({ hookName: givenHookName, lifeCycle: givenLifeCycle }) => {
        return givenHookName === hookName && givenLifeCycle === lifeCycle
      })
      .map(({ cb }) => cb)

    for (const cb of hooksMatched) {
      try {
        await cb.call(thisArg, payload, rollback)
      } catch (error) {
        // todo: throw hook error
        await Promise.all(rollback)
        throw new ErrorHook(error.message, { hookName, lifeCycle, error })
      }
    }
  }
}
