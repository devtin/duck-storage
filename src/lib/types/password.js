import { Transformers, Utils } from 'duckfficer'
import bcrypt from 'bcrypt'

Transformers.Password = {
  settings: {
    emptyPasswordError: 'Please enter a valid password'
  },
  loaders: [
    {
      type: [
        {
          type: String,
          allowEmpty: false,
          emptyError: 'Please enter a password'
        }
      ]
    }
  ],
  validate (value) {
    if (value === '' || value === undefined) {
      this.throwError(this.settings.emptyPasswordError, { value })
    }
  },
  // todo: add option to compare with old object
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
