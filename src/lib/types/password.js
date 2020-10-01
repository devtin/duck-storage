import { Transformers } from 'duckfficer'
import bcrypt from 'bcrypt'

Transformers.Password = {
  loaders: [
    {
      type: String,
      required: [true, 'Please enter a valid password']
    }
  ],
  // todo: add option to compare with old object
  parse (v, { state }) {
    if (state.method === 'create' || state.method === 'update') {
      return bcrypt.hash(v, 10)
    }
    return v
  }
}
