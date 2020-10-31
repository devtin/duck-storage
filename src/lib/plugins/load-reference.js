import { Utils } from 'duckfficer'
import set from 'lodash/set'
import ObjectId from 'bson-objectid'

export default function ({ DuckStorage, duckRack }) {
  const getReferences = (duckModel, entry) => {
    return duckModel
      .schema
      .paths
      .filter((path) => {
        return duckModel.schema.schemaAtPath(path).settings.duckRack && Utils.find(entry, path)
      })
      .map(path => {
        const _idPayload = Utils.find(entry, path)
        const _id = typeof _idPayload === 'object' && !ObjectId.isValid(_idPayload) ? _idPayload._id : _idPayload
        return { duckRack: duckModel.schema.schemaAtPath(path).settings.duckRack, _id, path }
      })
  }
  async function checkReferencesExists ({ entry }) {
    const entriesToLoad = getReferences(this.duckModel, entry)

    for (const entryToLoad of entriesToLoad) {
      const reference = await DuckStorage.getRackByName(entryToLoad.duckRack).findOneById(entryToLoad._id)
      if (reference === undefined) {
        throw new Error(`Could not find reference '${entryToLoad._id}' in rack '${entryToLoad.duckRack}'`)
      }
    }
  }

  async function loadReferences ({ entry, state }) {
    const entriesToLoad = getReferences(this.duckModel, entry)

    for (const entryToLoad of entriesToLoad) {
      set(entry, entryToLoad.path, await DuckStorage.getRackByName(entryToLoad.duckRack).findOneById(entryToLoad._id))
    }
  }

  duckRack.hook('after', 'read', loadReferences)
  duckRack.hook('after', 'create', loadReferences)
  duckRack.hook('before', 'create', checkReferencesExists)
}
