import { Utils } from 'duckfficer'
import set from 'lodash/set'

export default function ({ DuckStorage, duckRack }) {
  async function loadReferences (entry) {
    const entriesToLoad = this.duckModel
      .schema
      .paths
      .filter((path) => {
        return this.duckModel.schema.schemaAtPath(path).settings.duckRack && Utils.find(entry, path)
      })
      .map(path => {
        const Rack = DuckStorage.getRackByName(this.duckModel.schema.schemaAtPath(path).settings.duckRack)
        const _idPayload = Utils.find(entry, path)
        const _id = Rack.duckModel.schema.isValid(_idPayload) ? _idPayload._id : _idPayload
        return { duckRack: this.duckModel.schema.schemaAtPath(path).settings.duckRack, _id, path }
      })

    for (const entryToLoad of entriesToLoad) {
      set(entry, entryToLoad.path, await DuckStorage.getRackByName(entryToLoad.duckRack).findOneById(entryToLoad._id))
    }

    return entry
  }

  duckRack.hook('after', 'read', loadReferences)
  duckRack.hook('after', 'create', loadReferences)
}
