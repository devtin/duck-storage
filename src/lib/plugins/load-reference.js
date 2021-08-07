import { Utils } from 'duckfficer'
import set from 'lodash/set'
import ObjectId from 'bson-objectid'

export const name = 'load-reference'

export function handler ({ DuckStorage, duckRack }) {
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

  async function loadReferences ({ entry }) {
    const entriesToLoad = getReferences(this.duckModel, entry)

    for (const entryToLoad of entriesToLoad) {
      const foundReference = await DuckStorage.getRackByName(entryToLoad.duckRack).findOneById(entryToLoad._id)
      set(entry, entryToLoad.path, foundReference)
    }

    return entry
  }

  const loadBulkReferences = async function ({ result }) {
    const promisesToLoad = result.map((entry) => {
      return loadReferences.call(this, { entry })
    })
    await Promise.all(promisesToLoad)
  }

  duckRack.hook('before', 'create', checkReferencesExists)
  duckRack.hook('after', 'create', loadReferences)
  duckRack.hook('after', 'read', loadReferences)
  duckRack.hook('after', 'list', loadBulkReferences)
}
