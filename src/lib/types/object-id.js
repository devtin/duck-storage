import { Transformers } from 'duckfficer'
import ObjectId from 'bson-objectid'
import { DuckStorage } from '../duck-storage'

Transformers.ObjectId = {
  settings: {
    unique: true
  },
  async parse (v, { state }) {
    if (ObjectId.isValid(v)) {
      return ObjectId(v)
    }

    // TODO: filter (tree shake) at build
    if (this.settings.duckRack) {
      if (!DuckStorage.getRackByName(this.settings.duckRack)) {
        this.throwError(`Could not find rack '${this.settings.duckRack}'`)
      }

      const rawData = Object.assign({}, v)

      // todo: check if consolidated instead if is valid
      //       or maybe make isValid check if raw data is consolidated? :\
      if (state.method === 'create' || state.method === 'update') {
        return ObjectId(v._id)
      }

      return rawData
    }
    return v
  },
  async validate (v) {
    if (
      this.settings.duckRack &&
        await DuckStorage.getRackByName(this.settings.duckRack).duckModel.schema.isValid(v)
    ) {
      return
    }
    if (!ObjectId.isValid(v)) {
      this.throwError('Invalid ObjectId')
    }
  }
}
