import { Transformers } from '@devtin/schema-validator'
import ObjectId from 'bson-objectid'
import { DuckStorage } from '../duck-storage'

Transformers.ObjectId = {
  parse (v, { state }) {
    if (ObjectId.isValid(v)) {
      return ObjectId(v).toHexString()
    }

    // TODO: filter (tree shake) at build
    if (this.settings.rack) {
      if (!DuckStorage.getRackByName(this.settings.rack)) {
        this.throwError(`Could not find rack '${this.settings.rack}'`)
      }

      const rawData = Object.assign({}, v)

      if (
        DuckStorage.getRackByName(this.settings.rack).duckModel.schema.isValid(rawData)
      ) {
        if (state.method === 'create') {
          return ObjectId(v._id).toHexString()
        }

        return rawData
      }
    }
    return v
  },
  validate (v) {
    if (
      this.settings.duckRack &&
        DuckStorage.getRackByName(this.settings.duckRack).duckModel.schema.isValid(v)
    ) {
      return
    }
    if (!ObjectId.isValid(v)) {
      this.throwError('Invalid ObjectId')
    }
  }
}
