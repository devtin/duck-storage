import { Transformers, Utils } from 'duckfficer'
import bcrypt from 'bcrypt'

Transformers.Password = {
  settings: {
    required: false
  },
  loaders: [String],
  validate (value, { state }) {
    if (state.method === 'create' && !value) {
      this.throwError('Please enter a valid password', { value })
    }
  },
  parse (v, { state }) {
    if (
      state.method === 'create' ||
      (
        state.method === 'update' &&
        Utils.find(state.oldEntry || {}, this.fullPath) !== v
      )
    ) {
      return bcrypt.hash(v, 10)
    }
    return v
  }
}
