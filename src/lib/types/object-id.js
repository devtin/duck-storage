import { Transformers } from 'duckfficer'
import ObjectId from 'bson-objectid'

Transformers.ObjectId = {
  settings: {
    autoCast: true,
    unique: true
  },
  cast (v) {
    if (!ObjectId.isValid(v) && typeof v === 'object' && ObjectId.isValid(v._id)) {
      return v._id
    }
    return v
  },
  async parse (v, { state }) {
    if (ObjectId.isValid(v)) {
      return ObjectId(v).toString()
    }
    return v
  },
  validate (v) {
    if (!ObjectId.isValid(v)) {
      this.throwError('Invalid ObjectId')
    }
  }
}
