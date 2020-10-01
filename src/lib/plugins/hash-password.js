import bcrypt from 'bcrypt'
import set from 'lodash/set'
import get from 'lodash/get'
import { Utils } from 'duckfficer'
import '../types/password'

const { obj2dot } = Utils

export default function ({ DuckStorage, duckRack }) {
  async function encryptPasswords (entry, fields) {
    const fieldsToEncrypt = this.duckModel
      .schema
      .paths
      .filter((path) => {
        return (fields && fields.indexOf(path) >= 0) || (!fields && this.duckModel.schema.schemaAtPath(path).type === 'Password')
      })

    for (const field of fieldsToEncrypt) {
      set(entry, field, await bcrypt.hash(get(entry, field), 10))
    }

    return entry
  }

  duckRack.hook('before', 'create', ({ entry }) => encryptPasswords(entry))
  duckRack.hook('before', 'update', async function ({ oldEntry, newEntry, entry }) {
    const toHash = []
    obj2dot(newEntry).forEach((path) => {
      if (this.duckModel.schema.schemaAtPath(path).type === 'Password') {
        toHash.push(path)
      }
    })

    await encryptPasswords.call(this, entry, toHash)

    return {
      oldEntry,
      newEntry,
      entry
    }
  })
}
