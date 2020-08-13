/*!
 * duck-storage v0.0.8
 * (c) 2020 Martin Rafael Gonzalez <tin@devtin.io>
 * MIT
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var schemaValidator = require('@devtin/schema-validator');
var set = _interopDefault(require('lodash/set'));
var get = _interopDefault(require('lodash/get'));
var deepObjectDiff = require('deep-object-diff');
var bcrypt = _interopDefault(require('bcrypt'));
var events = require('events');
var sift = _interopDefault(require('sift'));
var camelCase = _interopDefault(require('lodash/camelCase'));
var kebabCase = _interopDefault(require('lodash/kebabCase'));
var jsDirIntoJson = require('js-dir-into-json');

function loadReference ({ DuckStorage, duckRack }) {
  async function loadReferences (entry) {
    const entriesToLoad = this.duckModel
      .schema
      .paths
      .filter((path) => {
        return this.duckModel.schema.schemaAtPath(path).settings.duckRack && schemaValidator.Utils.find(entry, path)
      })
      .map(path => {
        const Rack = DuckStorage.getRackByName(this.duckModel.schema.schemaAtPath(path).settings.duckRack);
        const _idPayload = schemaValidator.Utils.find(entry, path);
        const _id = Rack.duckModel.schema.isValid(_idPayload) ? _idPayload._id : _idPayload;
        return { duckRack: this.duckModel.schema.schemaAtPath(path).settings.duckRack, _id, path }
      });

    for (const entryToLoad of entriesToLoad) {
      set(entry, entryToLoad.path, await DuckStorage.getRackByName(entryToLoad.duckRack).findOneById(entryToLoad._id));
    }

    return entry
  }

  duckRack.hook('after', 'read', loadReferences);
  duckRack.hook('after', 'create', loadReferences);
}

function uniqueKeys ({ DuckStorage, duckRack }) {
  const keys = {};
  console.log('duckRack.duckModel', duckRack.duckModel);
  duckRack.duckModel.schema.children.forEach(schema => {
    if (schema.settings.unique) {
      const keyName = typeof schema.settings.unique === 'boolean' ? schema.fullPath : schema.settings.unique;
      if (!keys[keyName]) {
        keys[keyName] = [];
      }
      keys[keyName].push(schema.fullPath);
    }
  });

  async function checkPrimaryKeys (entry) {
    const $or = [];
    Object.keys(keys).forEach(keyName => {
      const $and = [];
      keys[keyName].forEach(propName => {
        $and.push({ [propName]: { $eq: get(entry, propName, undefined) } });
      });
      $or.push({ $and });
    });

    const found = await duckRack.find({ $or });

    if (found.length > 0 && found[0]._id !== entry._id) {
      // check which keys failed
      const failingEntry = found[0];
      const failingKeys = Object.keys(keys).filter(keyId => {
        const props = keys[keyId];
        const matchingKey = get(failingEntry, props);
        return Object.keys(deepObjectDiff.diff(matchingKey, get(entry, props))).length === 0
      });
      throw new Error(`primary keys (${failingKeys.join(', ')}) failed for document`)
    }

    return entry
  }

  duckRack.hook('before', 'create', checkPrimaryKeys);
  duckRack.hook('before', 'update', async ({ oldEntry, newEntry, entry }) => {
    await checkPrimaryKeys(entry);
    return {
      oldEntry,
      newEntry,
      entry
    }
  });
}

schemaValidator.Transformers.Password = {
  loaders: [
    {
      type: String,
      required: [true, 'Please enter a valid password']
    }
  ]
};

const { obj2dot } = schemaValidator.Utils;

function hashPasswords ({ DuckStorage, duckRack }) {
  async function encryptPasswords (entry, fields) {
    const fieldsToEncrypt = this.duckModel
      .schema
      .paths
      .filter((path) => {
        return (fields && fields.indexOf(path) >= 0) || (!fields && this.duckModel.schema.schemaAtPath(path).type === 'Password')
      });

    for (const field of fieldsToEncrypt) {
      console.log('set', field, get(entry, field));
      set(entry, field, await bcrypt.hash(get(entry, field), 10));
    }

    return entry
  }

  duckRack.hook('before', 'create', encryptPasswords);
  duckRack.hook('before', 'update', async function ({ oldEntry, newEntry, entry }) {
    const toHash = [];
    obj2dot(newEntry).forEach((path) => {
      if (this.duckModel.schema.schemaAtPath(path).type === 'Password') {
        toHash.push(path);
      }
    });

    await encryptPasswords.call(this, entry, toHash);

    return {
      oldEntry,
      newEntry,
      entry
    }
  });
}

var MACHINE_ID = Math.floor(Math.random() * 0xFFFFFF);
var index = ObjectID.index = parseInt(Math.random() * 0xFFFFFF, 10);
var pid = (typeof process === 'undefined' || typeof process.pid !== 'number' ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;

/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 */
var isBuffer = function (obj) {
  return !!(
  obj != null &&
  obj.constructor &&
  typeof obj.constructor.isBuffer === 'function' &&
  obj.constructor.isBuffer(obj)
  )
};

/**
 * Create a new immutable ObjectID instance
 *
 * @class Represents the BSON ObjectID type
 * @param {String|Number} arg Can be a 24 byte hex string, 12 byte binary string or a Number.
 * @return {Object} instance of ObjectID.
 */
function ObjectID(arg) {
  if(!(this instanceof ObjectID)) return new ObjectID(arg);
  if(arg && ((arg instanceof ObjectID) || arg._bsontype==="ObjectID"))
    return arg;

  var buf;

  if(isBuffer(arg) || (Array.isArray(arg) && arg.length===12)) {
    buf = Array.prototype.slice.call(arg);
  }
  else if(typeof arg === "string") {
    if(arg.length!==12 && !ObjectID.isValid(arg))
      throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");

    buf = buffer(arg);
  }
  else if(/number|undefined/.test(typeof arg)) {
    buf = buffer(generate(arg));
  }

  Object.defineProperty(this, "id", {
    enumerable: true,
    get: function() { return String.fromCharCode.apply(this, buf); }
  });
  Object.defineProperty(this, "str", {
    get: function() { return buf.map(hex.bind(this, 2)).join(''); }
  });
}
var objectid = ObjectID;
ObjectID.generate = generate;
ObjectID.default = ObjectID;

/**
 * Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
 *
 * @param {Number} time an integer number representing a number of seconds.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromTime = function(time){
  time = parseInt(time, 10) % 0xFFFFFFFF;
  return new ObjectID(hex(8,time)+"0000000000000000");
};

/**
 * Creates an ObjectID from a hex string representation of an ObjectID.
 *
 * @param {String} hexString create a ObjectID from a passed in 24 byte hexstring.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromHexString = function(hexString) {
  if(!ObjectID.isValid(hexString))
    throw new Error("Invalid ObjectID hex string");

  return new ObjectID(hexString);
};

/**
 * Checks if a value is a valid bson ObjectId
 *
 * @param {String} objectid Can be a 24 byte hex string or an instance of ObjectID.
 * @return {Boolean} return true if the value is a valid bson ObjectID, return false otherwise.
 * @api public
 *
 * THE NATIVE DOCUMENTATION ISN'T CLEAR ON THIS GUY!
 * http://mongodb.github.io/node-mongodb-native/api-bson-generated/objectid.html#objectid-isvalid
 */
ObjectID.isValid = function(objectid) {
  if(!objectid || (typeof objectid !== 'string' && (typeof objectid !== 'object' || Array.isArray(objectid) || typeof objectid.toString !== 'function'))) return false;

  //call .toString() to get the hex if we're
  // working with an instance of ObjectID
  return /^[0-9A-F]{24}$/i.test(objectid.toString());
};

/**
 * set a custom machineID
 * 
 * @param {String|Number} machineid Can be a string, hex-string or a number
 * @return {void}
 * @api public
 */
ObjectID.setMachineID = function(arg) {
  var machineID;

  if(typeof arg === "string") {
    // hex string
    machineID = parseInt(arg, 16);
   
    // any string
    if(isNaN(machineID)) {
      arg = ('000000' + arg).substr(-7,6);

      machineID = "";
      for(var i = 0;i<6; i++) {
        machineID += (arg.charCodeAt(i));
      }
    }
  }
  else if(/number|undefined/.test(typeof arg)) {
    machineID = arg | 0;
  }

  MACHINE_ID = (machineID & 0xFFFFFF);
};

/**
 * get the machineID
 * 
 * @return {number}
 * @api public
 */
ObjectID.getMachineID = function() {
  return MACHINE_ID;
};

ObjectID.prototype = {
  _bsontype: 'ObjectID',
  constructor: ObjectID,

  /**
   * Return the ObjectID id as a 24 byte hex string representation
   *
   * @return {String} return the 24 byte hex string representation.
   * @api public
   */
  toHexString: function() {
    return this.str;
  },

  /**
   * Compares the equality of this ObjectID with `otherID`.
   *
   * @param {Object} other ObjectID instance to compare against.
   * @return {Boolean} the result of comparing two ObjectID's
   * @api public
   */
  equals: function (other){
    return !!other && this.str === other.toString();
  },

  /**
   * Returns the generation date (accurate up to the second) that this ID was generated.
   *
   * @return {Date} the generation date
   * @api public
   */
  getTimestamp: function(){
    return new Date(parseInt(this.str.substr(0,8), 16) * 1000);
  }
};

function next() {
  return index = (index+1) % 0xFFFFFF;
}

function generate(time) {
  if (typeof time !== 'number')
    time = Date.now()/1000;

  //keep it in the ring!
  time = parseInt(time, 10) % 0xFFFFFFFF;

  //FFFFFFFF FFFFFF FFFF FFFFFF
  return hex(8,time) + hex(6,MACHINE_ID) + hex(4,pid) + hex(6,next());
}

function hex(length, n) {
  n = n.toString(16);
  return (n.length===length)? n : "00000000".substring(n.length, length) + n;
}

function buffer(str) {
  var i=0,out=[];

  if(str.length===24)
    for(;i<24; out.push(parseInt(str[i]+str[i+1], 16)),i+=2);

  else if(str.length===12)
    for(;i<12; out.push(str.charCodeAt(i)),i++);

  return out;
}

var inspect = (Symbol && Symbol.for('nodejs.util.inspect.custom')) || 'inspect';

/**
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @api private
 */
ObjectID.prototype[inspect] = function() { return "ObjectID("+this+")" };
ObjectID.prototype.toJSON = ObjectID.prototype.toHexString;
ObjectID.prototype.toString = ObjectID.prototype.toHexString;

schemaValidator.Transformers.ObjectId = {
  settings: {
    unique: true
  },
  parse (v, { state }) {
    if (objectid.isValid(v)) {
      return objectid(v).toHexString()
    }

    // TODO: filter (tree shake) at build
    if (this.settings.rack) {
      if (!DuckStorage.getRackByName(this.settings.rack)) {
        this.throwError(`Could not find rack '${this.settings.rack}'`);
      }

      const rawData = Object.assign({}, v);

      if (
        DuckStorage.getRackByName(this.settings.rack).duckModel.schema.isValid(rawData)
      ) {
        if (state.method === 'create') {
          return objectid(v._id).toHexString()
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
    if (!objectid.isValid(v)) {
      this.throwError('Invalid ObjectId');
    }
  }
};

const UUIDPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function uuid () {
  // GUID / UUID RFC4122 version 4 taken from: https://stackoverflow.com/a/2117523/1064165
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);

    return v.toString(16)
  })
}

schemaValidator.Transformers.uuid = {
  settings: {
    loaders: [{
      type: String,
      regex: [UUIDPattern, '{ value } is not a valid UUID']
    }],
    required: false,
    default: uuid
  }
};

const primitiveValues = [Number, BigInt, String, Object, Array, Boolean, Date];
const scalableValues = [Number, BigInt, Date];

const QuerySchema = new schemaValidator.Schema({
  // comparison
  $eq: primitiveValues,
  $ne: primitiveValues,
  $lte: scalableValues,
  $gte: scalableValues,
  $gt: scalableValues,
  $lt: scalableValues,
  $in: Array,
  $nin: Array,
  // logical
  $and: {
    type: Array,
    arraySchema: 'Query'
  },
  $not: {
    type: Array,
    arraySchema: 'Query'
  },
  $nor: {
    type: Array,
    arraySchema: 'Query'
  },
  $or: {
    type: Array,
    arraySchema: 'Query'
  },
  // element query
  $exists: Boolean,
  $type: {
    type: Function
  }
});

const Query = {
  settings: {
    autoCast: true
  },
  isOperator (o) {
    return Object.keys(o).filter(item => /^\$/.test(item)).length > 0
  },
  cast (v) {
    if (v !== undefined && !/^\$/.test(this.name) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
      return { $eq: v }
    }
    return v
  },
  parse (v) {
    if (!Query.isOperator(v)) {
      if (Object.keys(v).length === 0) {
        return v
      }

      return new schemaValidator.Schema({ type: Object, mapSchema: 'Query' }, {
        name: this.name,
        parent: this instanceof schemaValidator.Schema ? this : undefined
      }).parse(v)
    }

    const operator = Object.keys(v)[0];

    if (!QuerySchema.hasField(operator)) {
      const err = `Unknown operator ${operator}`;
      if (this.throwError) {
        this.throwError(err);
      }
      throw new Error(err)
    }

    // console.log(`looking for schema at`, this.fullPath, operator, QuerySchema.schemaAtPath(operator))
    return {
      [operator]: schemaValidator.Schema.cloneSchema({
        schema: QuerySchema.schemaAtPath(operator),
        name: `${this.fullPath}.${operator}`,
        parent: this instanceof schemaValidator.Schema ? this : undefined
      }).parse(v[operator])
    }
  },
  validate (v, { state }) {
    if (v && Query.isOperator(v) && Object.keys(v).length > 1) {
      this.throwError('Invalid operator');
    }
  }
};

schemaValidator.Transformers.Query = Query;

const SchemaType = new schemaValidator.Schema({
  type: Object
}, {
  parse (v) {
    return v instanceof schemaValidator.Schema ? v : new schemaValidator.Schema(v)
  }
});

const Meth = new schemaValidator.Schema({
  description: {
    type: String,
    required: false
  },
  input: {
    type: SchemaType,
    required: false
  },
  output: {
    type: SchemaType,
    required: false
  },
  handler: Function
}, {
  cast (v) {
    if (typeof v === 'function') {
      return {
        handler: v
      }
    }
    return v
  },
  parse (v) {
    if (!v.description && v.handler.name) {
      v.description = `methood ${v.handler.name}`;
    }
  }
});

const Methods = new schemaValidator.Schema({
  type: 'Object',
  mapSchema: Meth
}, {
  name: 'methods'
});

class ErrorHook extends Error {
  constructor (message, { hookName, lifeCycle, error }) {
    super(message);
    this.name = 'ErrorHook';
    this.hookName = hookName;
    this.lifeCycle = lifeCycle;
    this.error = error;
  }
}

class Hooks {
  constructor () {
    this.hooks = [];
  }

  hook (lifeCycle, hookName, cb) {
    this.hooks.push({ lifeCycle, hookName, cb });
  }

  async trigger (thisArg, lifeCycle, hookName, payload) {
    const hooksMatched = this
      .hooks
      .filter(({ hookName: givenHookName, lifeCycle: givenLifeCycle }) => {
        return givenHookName === hookName && givenLifeCycle === lifeCycle
      })
      .map(({ cb }) => cb);

    for (const cb of hooksMatched) {
      try {
        payload = await cb.call(thisArg, payload);
      } catch (error) {
        // todo: throw hook error
        throw new ErrorHook(error.message, { hookName, lifeCycle, error })
      }
    }

    return payload
  }
}

class DuckRackError extends Error {
  constructor (message, error) {
    super(message);
    this.error = error;
  }
}

class EventError extends Error {
  constructor (message) {
    super(message);
    this.name = 'EventError';
  }
}

const { forEach } = schemaValidator.Utils;

const Query$1 = new schemaValidator.Schema({
  type: 'Query'
});

/**
 * @class DuckRack
 * @classdesc Stores only ducks specified by the `duckModel`
 */
class DuckRack extends events.EventEmitter {
  constructor (name, {
    duckModel,
    events = {},
    methods = {},
    idType = 'ObjectId' // ObjectId || uuid
  } = {}) {
    if (!name) {
      throw new Error('A name must be provided for a DuckRack')
    }

    super();
    this.idType = idType;
    this.store = [];
    this.storeKey = Object.create(null);
    this.duckModel = duckModel;
    this.methods = Methods.parse(methods);
    this.events = events;
    this.name = name;

    this.hooks = new Hooks();

    this.trigger = this.hooks.trigger.bind(this.hooks, this);
    this.hook = this.hooks.hook.bind(this.hooks);

    const $this = this;

    // DuckStorage.registerRack(this)

    return new Proxy(this, {
      get (target, key) {
        if (target[key]) {
          return target[key]
        }
        if ($this.methods[key]) {
          return (...payload) => {
            const inputValidation = $this.methods[key].input ? schemaValidator.Schema.ensureSchema($this.methods[key].input) : undefined;
            const outputValidation = $this.methods[key].output ? schemaValidator.Schema.ensureSchema($this.methods[key].output) : undefined;

            if (inputValidation && payload.length > 1) {
              throw new DuckRackError(`Only one argument expected at method ${key}`)
            }

            const input = inputValidation ? [inputValidation.parse(payload[0])] : payload;

            try {
              const result = $this.methods[key].handler.call($this, ...input);
              return outputValidation ? outputValidation.parse(result) : result
            } catch (err) {
              throw new DuckRackError(err.message, err)
            }
          }
        }
      }
    })
  }

  dispatch (eventName, payload) {
    const eventKey = camelCase(eventName);
    eventName = kebabCase(eventName);
    try {
      this.emit(kebabCase(eventName), this.events[eventKey].parse(payload));
    } catch (err) {
      throw new EventError(`${eventName} payload is not valid`)
    }
  }

  get schema () {
    return this.duckModel.schema
  }

  static runQuery (entity, query) {
    return entity.filter(sift(query))
  }

  /**
   * @event DuckRack#create
   * @type {Object} - the duck
   */

  /**
   * @param newEntry
   * @return {Promise<*>}
   * @fires {DuckRack#create}
   */

  async create (newEntry = {}) {
    if (typeof newEntry !== 'object' || newEntry === null || Array.isArray(newEntry)) {
      throw new Error('An entry must be provided')
    }

    DuckRack.validateEntryVersion(newEntry);

    const { store, storeKey } = this;

/*
    if (newEntry._id && await this.entryExists(newEntry._id)) {
      throw new Error(`Entry ${newEntry._id} already exists`)
    }
*/

    let entry = this.schema.parse(newEntry, { state: { method: 'create' } });

    entry = await this.trigger('before', 'create', newEntry);

    storeKey[entry._id] = entry;
    store.push(entry);

    const entryModel = await this.trigger('after', 'create', this.duckModel.getModel(entry));
    this.emit('create', entryModel);

    return entryModel
  }

  /**
   * Sugar for `find(entityName, { _id: { $eq: _id } })`
   * @param _id
   * @return {Promise<*>}
   */
  async read (_id) {
    const entry = await this.findOneById(_id);
    if (entry) {
      const entryModel = this.duckModel.getModel(Object.assign({}, await this.trigger('before', 'read', entry)));
      return this.trigger('after', 'read', entryModel)
    }
  }

  /**
   * @event DuckRack#update
   * @type {Object}
   * @property {Object} oldEntry - the entry as it was in previous state
   * @property {Object} newEntry - received patching object
   * @property {Object} entry - the resulting object
   */

  /**
   * Updates ducks matching given `query` with given `newEntry`
   * @fires {DuckRack#update}
   */

  async update (query, newEntry) {
    const entries = (await this.find(query)).map(oldEntry => {
      if (newEntry && newEntry._id && oldEntry._id !== newEntry._id) {
        throw new Error('_id\'s cannot be modified')
      }

      if (newEntry._v && newEntry._v !== oldEntry._v) {
        throw new Error('Entry version mismatch')
      }

      return oldEntry
    });

    for (const oldEntry of entries) {
      const entry = Object.assign({}, oldEntry, newEntry);

      if (Object.keys(deepObjectDiff.updatedDiff(oldEntry, entry)).length === 0) {
        continue
      }

      entry._v = oldEntry._v + 1;

      await this.trigger('before', 'update', { oldEntry, newEntry, entry });
      this.emit('update', { oldEntry: Object.assign({}, oldEntry), newEntry, entry });
      Object.assign(oldEntry, entry);
      await this.trigger('after', 'update', { oldEntry, newEntry, entry });
    }

    return entries
  }

  /**
   * @event DuckRack#delete
   * @type {Object}
   * @property {Object} oldEntry - the entry as it was in previous state
   * @property {Object} newEntry - received patching object
   * @property {Object} entry - the resulting object
   */

  /**
   * Deletes ducks matching given `query`
   * @fires {DuckRack#delete}
   */

  async delete (query) {
    const entity = this.store;
    const removedEntries = entity.filter(sift(query));

    for (const entry of removedEntries) {
      await this.trigger('before', 'remove', entry);
      this.deleteById(entry._id);
      this.emit('delete', entry);
      await this.trigger('after', 'remove', entry);
    }

    return removedEntries
  }

  deleteById (_id) {
    this.validateId(_id);
    let foundIndex = null;

    forEach(this.store, (item, i) => {
      if (item._id === _id) {
        foundIndex = i;
        return false
      }
    });

    const foundEntry = this.storeKey[_id];

    if (foundEntry) {
      delete this.storeKey[_id];
    }

    if (foundIndex !== null) {
      this.store.splice(foundIndex, 1);
    }
  }

  async list (query) {
    return (query ? await this.find(query) : this.store).map(value => {
      return this.duckModel.getModel(value)
    })
  }

  validateId () {
    // todo: validate id type / value
    return true
  }

  async entryExists (_id) {
    this.validateId(_id);
    return this.storeKey[_id] !== undefined
  }

  async findOneById (_id) {
    const queryInput = {
      _id: {
        $eq: _id
      }
    };
    return (await DuckRack.runQuery(this.store, Query$1.parse(queryInput)))[0]
  }

  async find (queryInput) {
    if (typeof queryInput !== 'object') {
      queryInput = {
        _id: {
          $eq: queryInput
        }
      };
    }

    return DuckRack.runQuery(this.store, Query$1.parse(queryInput))
  }

  static validateEntryVersion (newEntry, oldEntry) {
    if (!newEntry || typeof newEntry !== 'object' || Array.isArray(newEntry)) {
      throw new Error('Entry must be an object')
    }

    if (Object.prototype.hasOwnProperty.call(newEntry, '_v') && typeof newEntry._v !== 'number') {
      throw new Error('Invalid entry version')
    }

    // oldEntry._v > newEntry._d => version mismatch
    if (oldEntry && newEntry._v && oldEntry._v > newEntry._v) {
      throw new Error('Entry version mismatch')
    }
  }
}

class DuckStorageClass extends events.EventEmitter {
  constructor () {
    super();
    this.store = Object.create(null);
    this.plugins = [loadReference, uniqueKeys, hashPasswords];
  }

  _wireRack (rack) {
    rack.on('create', (payload) => {
      this.emit('create', {
        entityName: rack.name,
        payload
      });
    });
    rack.on('read', (payload) => {
      this.emit('read', {
        entityName: rack.name,
        payload
      });
    });
    rack.on('update', (payload) => {
      this.emit('update', {
        entityName: rack.name,
        payload
      });
    });
    rack.on('delete', (payload) => {
      this.emit('delete', {
        entityName: rack.name,
        payload
      });
    });
    rack.on('list', (payload) => {
      this.emit('list', {
        entityName: rack.name,
        payload
      });
    });
  }

  init (name, model, { methods, events } = {}) {
    const duckRack = new DuckRack(name, {
      duckModel: model,
      methods,
      events
    });
    this.registerRack(duckRack);
    return duckRack
  }

  plugin (fn) {
    this.plugins.push(fn);
  }

  registerRack (duckRack) {
    if (this.store[duckRack.name]) {
      throw new Error(`a DuckRack with the name ${duckRack.name} is already registered`)
    }

    this.store[duckRack.name] = duckRack;
    this.plugins.forEach(fn => {
      fn({ DuckStorage: this, duckRack });
    });
    this._wireRack(duckRack);
  }

  removeRack (rackName) {
    if (!this.store[rackName]) {
      throw new Error(`a DuckRack with the name ${rackName} could not be found`)
    }

    delete this.store[rackName];
  }

  listRacks () {
    return Object.keys(this.store)
  }

  getRackByName (rackName) {
    return this.store[rackName]
  }
}

const DuckStorage = new DuckStorageClass();

function parsePath(text) {
  return text.split('.')
}

function push(arr, el) {
  const newArr = arr.slice();
  newArr.push(el);
  return newArr;
}

// names of the traps that can be registered with ES6's Proxy object
const trapNames = [
  'apply',
  'construct',
  'defineProperty',
  'deleteProperty',
  'enumerate',
  'get',
  'getOwnPropertyDescriptor',
  'getPrototypeOf',
  'has',
  'isExtensible',
  'ownKeys',
  'preventExtensions',
  'set',
  'setPrototypeOf',
];

// a list of paramer indexes that indicate that the a recieves a key at that parameter
// this information will be used to update the path accordingly
const keys = {
  get: 1,
  set: 1,
  deleteProperty: 1,
  has: 1,
  defineProperty: 1,
  getOwnPropertyDescriptor: 1,
};

function DeepProxy(rootTarget, traps, options) {

  let path = [];
  let userData = {};

  if (options !== undefined && typeof options.path !== 'undefined') {
    path = parsePath(options.path);
  }
  if (options !== undefined && typeof options.userData !== 'undefined') {
    userData = options.userData;
  }

  function createProxy(target, path) {

    // avoid creating a new object between two traps
    const context = { rootTarget, path };
    Object.assign(context, userData);

    const realTraps = {};

    for (const trapName of trapNames) {
      const keyParamIdx = keys[trapName]
          , trap = traps[trapName];

      if (typeof trap !== 'undefined') {

        if (typeof keyParamIdx !== 'undefined') {

          realTraps[trapName] = function () {

            const key = arguments[keyParamIdx];

            // update context for this trap
            context.nest = function (nestedTarget) {
              if (nestedTarget === undefined)
                nestedTarget = rootTarget;
              return createProxy(nestedTarget, push(path, key)); 
            };

            return trap.apply(context, arguments);
          };
        } else {

          realTraps[trapName] = function () {

            // update context for this trap
            context.nest = function (nestedTarget) {
              if (nestedTarget === undefined)
                nestedTarget = {};
              return createProxy(nestedTarget, path);
            };

            return trap.apply(context, arguments);
          };
        }
      }
    }

    return new Proxy(target, realTraps);
  }

  return createProxy(rootTarget, path);

}

var proxyDeep = DeepProxy;

function pathToObj (path, value) {
  return path.split('.').reverse().reduce((value, index) => { return { [index]: value } }, value)
}

const virtualReservedProps = ['$$typeof', 'valueOf', 'constructor', 'then', 'toJSON'];

const Doc = {
  toObject (doc, state = {}) {
    return this.schema.parse(Object.assign({}, doc), { state })
  }
};

const deeplyRequired = (schema, path) => {
  const [rootPath, restPath] = path.split('.');
  if (schema.schemaAtPath(rootPath).settings.required) {
    return restPath ? deeplyRequired(schema.schemaAtPath(rootPath), restPath) : true
  }
  return false
};

/**
 * @class Duck
 * @classdesc A duck model
 */
class Duck extends events.EventEmitter {
  constructor ({
    schema,
    idType = 'ObjectId',
    inlineParsing = true,
    inlineStructureValidation = true
  } = {}) {
    super();
    const originalSchema = schemaValidator.Schema.ensureSchema(schema);
    this.originalSchema = originalSchema;

    schema = schemaValidator.Schema.cloneSchema({ schema: originalSchema });

    if (schema.hasField('_id')) {
      throw new Error('_id is reserved for the duck')
    }

    if (schema.hasField('_v')) {
      throw new Error('_id is reserved for the duck')
    }

    const _id = new schemaValidator.Schema(idType, {
      name: '_id',
      settings: {
        required: false,
        default () {
          return objectid().toHexString()
        }
      }
    });

    const _v = new schemaValidator.Schema({
      type: Number,
      autoCast: true,
      required: false,
      default () {
        return 1
      }
    }, { name: '_v' });

    _v.parent = schema;
    _id.parent = schema;

    schema.children.unshift(_id, _v);

    this.schema = schema;
    this.inlineParsing = inlineParsing;
    this.inlineStructureValidation = inlineStructureValidation;
    this.idType = idType;
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
  getModel (defaultValues = {}, state) {
    const $this = this;
    let data = {};
    let consolidated = this.schema.isValid(defaultValues);

    const consolidate = () => {
      data = this.schema.parse(data);
      consolidated = true;
      return data
    };

    this.schema.paths.forEach(path => {
      const def = this.schema.schemaAtPath(path).settings.default;
      const defaultValue = defaultValues[path] || (def ? (typeof def === 'function' ? def() : def) : undefined);

      if (defaultValue !== undefined || deeplyRequired(this.schema, path)) {
        set(data, path, defaultValue);
      }
    });

    // const
    const theModelProxy = new proxyDeep(data, {
      get (target, key) {
        if (typeof key !== 'string') {
          return this.nest({})
        }
        // const val = Reflect.get(target, key, receiver)
        const parentPath = this.path.join('.');
        const finalPath = this.path.concat(key).join('.');

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

        const obj = pathToObj(finalPath, undefined);
        const parentSchema = parentPath ? $this.schema.schemaAtPath(parentPath) : $this.schema;
        const parentObj = parentPath ? schemaValidator.Utils.find(data, finalPath) : data;

        // find methods
        if (parentSchema && parentSchema._methods[finalPath]) {
          if (!consolidated) {
            throw new Error(`consolidate the model prior invoking method ${finalPath}`)
          }
          return parentObj[finalPath]
        }

        // virtuals (getters / setters)
        const virtual = parentSchema ? parentSchema.virtuals.filter(({ path }) => {
          return path === key
        })[0] : false;

        if (virtual) {
          return virtual.getter.call(parentPath ? schemaValidator.Utils.find(data, parentPath) : data)
        }

        try {
          $this.schema.structureValidation(obj);
        } catch ({ errors }) {
          throw errors[0]
        }

        // deliver primitive value (or final value in the schema path)
        if (!$this.schema.schemaAtPath(finalPath).hasChildren) {
          return schemaValidator.Utils.find(data, finalPath)
        }

        return this.nest({})
      },
      set (target, path, value) {
        const parentPath = this.path.join('.');
        const finalPath = this.path.concat(path).join('.');

        // virtuals
        const parentSchema = parentPath ? $this.schema.schemaAtPath(parentPath) : $this.schema;
        const virtual = parentSchema.virtuals.filter(({ path: thePath }) => {
          return thePath === path
        })[0];

        if (virtual) {
          virtual.setter.call(parentPath ? schemaValidator.Utils.find(data, parentPath) : data, value);
          return true
        }

        if ($this.inlineStructureValidation) {
          const obj = pathToObj(finalPath, undefined);
          try {
            $this.schema.structureValidation(obj);
          } catch ({ errors }) {
            throw errors[0]
          }
        }

        return set(data, finalPath, $this.inlineParsing ? $this.schema.schemaAtPath(finalPath).parse(value, { state }) : value)
      }
    });

    return theModelProxy
  }
}

async function registerDuckRacksFromDir (directory) {
  const racks = await jsDirIntoJson.jsDirIntoJson(directory);
  Object.keys(racks).forEach((rackName) => {
    const { duckModel, methods } = racks[rackName];
    const schema = new schemaValidator.Schema(duckModel.schema, { methods: duckModel.methods });
    const duckRack = new DuckRack(rackName, { duckModel: new Duck({ schema }), methods });
    DuckStorage.registerRack(duckRack);
  });
  return racks
}

exports.Duckfficer = schemaValidator;
exports.Duck = Duck;
exports.DuckRack = DuckRack;
exports.DuckStorage = DuckStorage;
exports.registerDuckRacksFromDir = registerDuckRacksFromDir;
