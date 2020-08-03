import { Schema } from '@devtin/schema-validator'

const SchemaType = new Schema({
  type: Object
}, {
  parse (v) {
    return v instanceof Schema ? v : new Schema(v)
  }
})

export const Meth = new Schema({
  input: {
    type: SchemaType,
    required: false
  },
  output: {
    type: SchemaType,
    required: false
  },
  handler: Function
}, {
  cast (v) {
    if (typeof v === 'function') {
      return {
        handler: v
      }
    }
    return v
  }
})

export const Methods = new Schema({
  type: 'Object',
  mapSchema: Meth
}, {
  name: 'methods'
})
