import { Schema } from 'duckfficer'

const BooleanOrSchema = new Schema({
  type: [Object, Boolean]
}, {
  cast (v) {
    if (typeof v === 'object') {
      return Schema.ensureSchema(v)
    }
    return v
  }
})

export const Meth = new Schema({
  description: {
    type: String,
    required: false
  },
  input: {
    type: BooleanOrSchema,
    required: false
  },
  output: {
    type: BooleanOrSchema,
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
  },
  parse (v) {
    if (!v.description && v.handler.name) {
      v.description = `methood ${v.handler.name}`
    }
  }
})

export const Methods = new Schema({
  type: 'Object',
  mapSchema: Meth
}, {
  name: 'methods'
})
