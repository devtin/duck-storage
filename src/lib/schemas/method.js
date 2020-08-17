import { Schema } from 'duckfficer'

const SchemaType = new Schema({
  type: Object
}, {
  parse (v) {
    return v instanceof Schema ? v : new Schema(v)
  }
})

export const Meth = new Schema({
  description: {
    type: String,
    required: false
  },
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
