import DeepProxy from 'proxy-deep'
import set from 'lodash/set'
import { EventEmitter } from 'events'
import { Schema, Utils } from 'duckfficer'
import './types/object-id'
import './types/uuid'
import { pathToObj } from './path-to-object'
import ObjectId from 'bson-objectid'

const virtualReservedProps = ['$$typeof', 'valueOf', 'constructor', 'then', 'toJSON']

const Doc = {
  toObject (doc, state = {}, virtualsEnumerable = false) {
    return this.schema.parse(Object.assign({}, doc), { state, virtualsEnumerable })
  }
}

const deeplyRequired = (schema, path) => {
  const [rootPath, restPath] = path.split('.')
  if (schema.schemaAtPath(rootPath).settings.required) {
    return restPath ? deeplyRequired(schema.schemaAtPath(rootPath), restPath) : true
  }
  return false
}

/**
 * @class Duck
 * @classdesc A duck model
 */
export class Duck extends EventEmitter {
  constructor ({
    schema,
    idType = 'ObjectId',
    inlineStructureValidation = true
  } = {}) {
    super()
    const originalSchema = Schema.ensureSchema(schema)
    this.originalSchema = originalSchema

    schema = Schema.cloneSchema({ schema: originalSchema })

    if (schema.hasField('_id')) {
      throw new Error('_id is reserved for the duck')
    }

    if (schema.hasField('_v')) {
      throw new Error('_v is reserved for the duck')
    }

    const _id = new Schema(idType, {
      name: '_id',
      settings: {
        required: false,
        default () {
          return ObjectId().toHexString()
        }
      }
    })

    const _v = new Schema({
      type: Number,
      autoCast: true,
      required: false,
      default () {
        return 1
      }
    }, { name: '_v' })

    _v.parent = schema
    _id.parent = schema

    schema.children.unshift(_id, _v)

    this.schema = schema
    this.inlineStructureValidation = inlineStructureValidation
    this.idType = idType
  }

  /**
   * Sugar for calling `new Duck({...}).getModel()`
   * @param {Object} duckPayload - the duck constructor payload
   * @param [modelPayload] - the model payload
   * @return {Object} the duck proxy model
   */
  static create (duckPayload, ...modelPayload) {
    return new Duck(duckPayload).getModel(modelPayload)
  }

  /**
   * Prepares a duck proxy model to be used with the defined schema
   *
   * @param {Object} [defaultValues]
   * @param {Object} [state]
   * @return {Object} the duck proxy model
   */
  async getModel (defaultValues = {}, state = {}) {
    const $this = this
    const data = {}
    let consolidated = await this.schema.isValid(defaultValues)

    const consolidate = async ({ virtualsEnumerable = false } = {}) => {
      const dataConsolidated = await this.schema.parse(data, { virtualsEnumerable, state })
      consolidated = true
      return dataConsolidated
    }

    await Utils.PromiseEach(this.schema.paths, async path => {
      const def = this.schema.schemaAtPath(path).settings.default

      const getDefaultValue = async () => {
        if (defaultValues[path] !== undefined) {
          return defaultValues[path]
        }

        return def !== undefined ? (typeof def === 'function' ? await def() : def) : undefined
      }

      const defaultValue = await getDefaultValue()

      if (defaultValue !== undefined || deeplyRequired(this.schema, path)) {
        set(data, path, defaultValue)
      }
    })

    const theModelProxy = new DeepProxy(data, {
      get (target, key) {
        if (typeof key !== 'string') {
          return this.nest({})
        }
        // const val = Reflect.get(target, key, receiver)
        const parentPath = this.path.join('.')
        const finalPath = this.path.concat(key).join('.')

        if (virtualReservedProps.indexOf(key) >= 0) {
          return undefined
        }

        // solving co0nsolidation
        if (finalPath === 'consolidate') {
          return consolidate
        }

        // retrieving a doc method
        if (Doc[finalPath]) {
          return Doc[finalPath].bind($this, theModelProxy, state)
        }

        const obj = pathToObj(finalPath, undefined)
        const parentSchema = parentPath ? $this.schema.schemaAtPath(parentPath) : $this.schema
        const parentObj = parentPath ? Utils.find(data, finalPath) : data

        // find methods
        if (parentSchema && parentSchema._methods[finalPath]) {
          if (!consolidated) {
            throw new Error(`consolidate the model prior invoking method ${finalPath}`)
          }
          return parentObj[finalPath]
        }

        const getVirtual = () => {
          if (parentSchema) {
            return parentSchema.virtuals.filter(({ path }) => {
              return path === key
            })[0]
          }

          return false
        }

        // virtuals (getters / setters)
        const virtual = getVirtual()

        if (virtual) {
          return virtual.getter.call(parentPath ? Utils.find(data, parentPath) : data)
        }

        try {
          $this.schema.structureValidation(obj)
        } catch ({ errors }) {
          throw errors[0]
        }

        // deliver primitive value (or final value in the schema path)
        if (!$this.schema.schemaAtPath(finalPath).hasChildren) {
          return Utils.find(data, finalPath)
        }

        return this.nest({})
      },
      set (target, path, value) {
        const parentPath = this.path.join('.')
        const finalPath = this.path.concat(path).join('.')

        // virtuals
        const parentSchema = parentPath ? $this.schema.schemaAtPath(parentPath) : $this.schema
        const virtual = parentSchema.virtuals.filter(({ path: thePath }) => {
          return thePath === path
        })[0]

        if (virtual) {
          virtual.setter.call(parentPath ? Utils.find(data, parentPath) : data, value)
          return true
        }

        if ($this.inlineStructureValidation) {
          const obj = pathToObj(finalPath, undefined)
          try {
            $this.schema.structureValidation(obj)
          } catch ({ errors }) {
            throw errors[0]
          }
        }

        return set(data, finalPath, value)
      }
    })

    return theModelProxy
  }
}
