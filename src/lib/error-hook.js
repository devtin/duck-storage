export class ErrorHook extends Error {
  constructor (message, { hookName, lifeCycle, error }) {
    super(message)
    this.name = 'ErrorHook'
    this.hookName = hookName
    this.lifeCycle = lifeCycle
    this.error = error
  }
}
