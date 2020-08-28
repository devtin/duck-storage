import { Schema, Transformers } from 'duckfficer'

// const primitiveValues = [Number, BigInt, String, Object, Array, Boolean, Date]
// const scalableValues = [Number, BigInt, Date]

export const SortSchema = new Schema({
  $sort: Object
})

export const Sort = {
  settings: {
    autoCast: true
  },
  isSort (o) {
    return Object.keys(o).filter(item => /^\$/.test(item)).length > 0
  },
  cast (v) {
    if (v !== undefined && !/^\$/.test(this.name) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
      return { $eq: v }
    }
    return v
  },
  parse (v) {
    if (!Sort.isOperator(v)) {
      if (Object.keys(v).length === 0) {
        return v
      }

      return new Schema({ type: Object, mapSchema: 'Query' }, {
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

    // console.log(`looking for schema at`, this.fullPath, operator, QuerySchema.schemaAtPath(operator))
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
