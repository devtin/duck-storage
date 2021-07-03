import { Transformers } from 'duckfficer'

Transformers.Password = {
  settings: {
    required: false
  },
  loaders: [String],
  validate (value) {
    if (!value) {
      this.throwError('Please enter a valid password', { value })
    }
  }
}
