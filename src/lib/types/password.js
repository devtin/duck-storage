import { Transformers } from '@devtin/schema-validator'

Transformers.Password = {
  loaders: [
    {
      type: String,
      required: [true, 'Please enter a valid password']
    }
  ]
}
