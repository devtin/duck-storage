import { Transformers } from 'duckfficer'

Transformers.Password = {
  loaders: [
    {
      type: String,
      required: [true, 'Please enter a valid password']
    }
  ]
}
