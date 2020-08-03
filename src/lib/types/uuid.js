import { Transformers } from '@devtin/schema-validator'

export const UUIDPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}$/

export function uuid () {
  // GUID / UUID RFC4122 version 4 taken from: https://stackoverflow.com/a/2117523/1064165
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)

    return v.toString(16)
  })
}

Transformers.uuid = {
  settings: {
    loaders: [{
      type: String,
      regex: [UUIDPattern, '{ value } is not a valid UUID']
    }],
    required: false,
    default: uuid
  }
}
