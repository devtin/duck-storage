import { Schema, Transformers } from 'duckfficer'

export const SortSchema = new Schema({
  type: Object
})

export const Sort = {
  settings: {
    required: false,
    autoCast: true
  },
  isSort (o) {
    return Object.keys(o).filter(item => /^\$/.test(item)).length > 0
  },
  cast (v, payload) {
    if (typeof v === 'string') {
      try {
        return JSON.parse(v)
      } catch (err) {}
    }
    return v
  },
  parse (v) {
    if (!Sort.isSort(v)) {
      if (Object.keys(v).length === 0) {
        return v
      }

      return new Schema({ type: Object, mapSchema: 'Sort' }, {
        name: this.name,
        parent: this instanceof Schema ? this : undefined
      }).parse(v)
    }

    const operator = Object.keys(v)[0]

    if (!SortSchema.hasField(operator)) {
      const err = `Unknown operator ${operator}`
      if (this.throwError) {
        this.throwError(err)
      }
      throw new Error(err)
    }

    return {
      [operator]: Schema.cloneSchema({
        schema: SortSchema.schemaAtPath(operator),
        name: `${this.fullPath}.${operator}`,
        parent: this instanceof Schema ? this : undefined
      }).parse(v[operator])
    }
  },
  validate (v, { state }) {
    if (v && Sort.isSort(v) && Object.keys(v).length > 1) {
      this.throwError('Invalid sorter')
    }
  }
}

Transformers.Sort = Sort
