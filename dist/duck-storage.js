/*!
 * duck-storage v0.0.19
 * (c) 2020 Martin Rafael Gonzalez <tin@devtin.io>
 * MIT
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var events = require('events');
var R = require('ramda');
var duckfficer = require('duckfficer');
var set = require('lodash/set');
var get = require('lodash/get');
var deepObjectDiff = require('deep-object-diff');
var camelCase = require('lodash/camelCase');
var kebabCase = require('lodash/kebabCase');
var cloneDeep = require('lodash/cloneDeep');
var Promise$1 = require('bluebird');
var bcrypt = require('bcrypt');
var jsDirIntoJson = require('js-dir-into-json');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

var R__default = /*#__PURE__*/_interopDefaultLegacy(R);
var duckfficer__namespace = /*#__PURE__*/_interopNamespace(duckfficer);
var set__default = /*#__PURE__*/_interopDefaultLegacy(set);
var get__default = /*#__PURE__*/_interopDefaultLegacy(get);
var camelCase__default = /*#__PURE__*/_interopDefaultLegacy(camelCase);
var kebabCase__default = /*#__PURE__*/_interopDefaultLegacy(kebabCase);
var cloneDeep__default = /*#__PURE__*/_interopDefaultLegacy(cloneDeep);
var Promise__default = /*#__PURE__*/_interopDefaultLegacy(Promise$1);
var bcrypt__default = /*#__PURE__*/_interopDefaultLegacy(bcrypt);

const getLockSkip = R__default['default'].path(['lock', 'skip']);
const isObj = v => {
  return typeof v === 'object' && !Array.isArray(v)
};
const notObj = R__default['default'].compose(R__default['default'].not, isObj);

const skipLock = R__default['default'].cond([
  [notObj, R__default['default'].F],
  [R__default['default'].compose(R__default['default'].isNil, getLockSkip), R__default['default'].T],
  [R__default['default'].T, getLockSkip]
]);

const doLock = R__default['default'].compose(R__default['default'].not, skipLock);

function lock ({ lockTimeout = 3000 } = {}) {
  return ({ duckRack }) => {
    const unlocked = new events.EventEmitter();
    const locked = new Set();
    const waitIfLocked = (_id, timeout) => {
      if (locked.has(_id)) {
        return new Promise((resolve, reject) => {
          unlocked.on(_id, resolve);
          setTimeout(() => reject(new Error(`lock time-out for _id ${_id}`)), timeout);
        })
      }
    };

    duckRack.lock = async (id, timeout = lockTimeout) => {
      if (locked.has(id)) {
        const init = Date.now();
        await waitIfLocked(id, timeout);
        const timeSpent = Date.now() - init;
        return duckRack.lock(id, Math.max(timeout - timeSpent, 0))
      }
      locked.add(id);
    };

    duckRack.unlock = (_id) => {
      locked.delete(_id);
      unlocked.emit(_id);
    };

    duckRack.isLocked = (_id) => {
      return locked.has(_id)
    };

    duckRack.hook('before', 'apply', async ({ state }) => {
      Object.assign(state, {
        lock: {
          skip: true
        }
      });
    });
    duckRack.hook('before', 'create', async ({ entry, state }, rollback) => {
      const { _id } = entry;
      if (doLock(state)) {
        await duckRack.lock(_id);
      }
      rollback.push(duckRack.unlock.bind(duckRack, _id));
    });
    duckRack.hook('before', 'update', async ({ oldEntry, newEntry, entry, state }, rollback) => {
      const { _id } = oldEntry;
      if (doLock(state)) {
        await duckRack.lock(_id);
      }
      rollback.push(duckRack.unlock.bind(duckRack, _id));
    });
    duckRack.hook('after', 'update', async ({ oldEntry, newEntry, entry }) => {
      duckRack.unlock(oldEntry._id);
    });
    duckRack.hook('before', 'delete', async ({ entry, state }, rollback) => {
      const { _id } = entry;
      if (doLock(state)) {
        await duckRack.lock(_id);
      }
      rollback.push(duckRack.unlock.bind(duckRack, _id));
    });
    duckRack.hook('after', 'delete', async ({ entry }) => {
      const { _id } = entry;
      duckRack.unlock(_id);
    });
  }
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

function loadReference ({ DuckStorage, duckRack }) {
  const getReferences = (duckModel, entry) => {
    return duckModel
      .schema
      .paths
      .filter((path) => {
        return duckModel.schema.schemaAtPath(path).settings.duckRack && duckfficer.Utils.find(entry, path)
      })
      .map(path => {
        const _idPayload = duckfficer.Utils.find(entry, path);
        const _id = typeof _idPayload === 'object' && !objectid.isValid(_idPayload) ? _idPayload._id : _idPayload;
        return { duckRack: duckModel.schema.schemaAtPath(path).settings.duckRack, _id, path }
      })
  };
  async function checkReferencesExists ({ entry }) {
    const entriesToLoad = getReferences(this.duckModel, entry);

    for (const entryToLoad of entriesToLoad) {
      const reference = await DuckStorage.getRackByName(entryToLoad.duckRack).findOneById(entryToLoad._id);
      if (reference === undefined) {
        throw new Error(`Could not find reference '${entryToLoad._id}' in rack '${entryToLoad.duckRack}'`)
      }
    }
  }

  async function loadReferences ({ entry, state }) {
    const entriesToLoad = getReferences(this.duckModel, entry);

    for (const entryToLoad of entriesToLoad) {
      set__default['default'](entry, entryToLoad.path, await DuckStorage.getRackByName(entryToLoad.duckRack).findOneById(entryToLoad._id));
    }
  }

  duckRack.hook('after', 'read', loadReferences);
  duckRack.hook('after', 'create', loadReferences);
  duckRack.hook('before', 'create', checkReferencesExists);
}

function uniqueKeys ({ DuckStorage, duckRack }) {
  const keys = {};
  duckRack.duckModel.schema.children.forEach(schema => {
    if (schema.settings.unique) {
      const keyName = typeof schema.settings.unique === 'boolean' ? schema.fullPath : schema.settings.unique;
      if (!keys[keyName]) {
        keys[keyName] = [];
      }
      keys[keyName].push(schema.fullPath);
    }
  });

  async function checkPrimaryKeys ({ entry } = {}) {
    const $or = [];
    Object.keys(keys).forEach(keyName => {
      const $and = [];
      keys[keyName].forEach(propName => {
        $and.push({ [propName]: { $eq: get__default['default'](entry, propName, undefined) } });
      });
      $or.push({ $and });
    });

    const found = await duckRack.find({ $or });

    if (found.length > 0 && !objectid(found[0]._id).equals(entry._id)) {
      // check which keys failed
      const failingEntry = found[0];
      const failingKeys = Object.keys(keys).filter(keyId => {
        const props = keys[keyId];
        const matchingKey = get__default['default'](failingEntry, props);
        return Object.keys(deepObjectDiff.diff(matchingKey, get__default['default'](entry, props))).length === 0
      });
      throw new Error(`primary keys (${failingKeys.join(', ')}) failed for document`)
    }
  }

  duckRack.hook('before', 'create', checkPrimaryKeys);
  duckRack.hook('before', 'update', async ({ oldEntry, newEntry, entry }) => {
    await checkPrimaryKeys({ entry });
    return {
      oldEntry,
      newEntry,
      entry
    }
  });
}

// const primitiveValues = [Number, BigInt, String, Object, Array, Boolean, Date]
// const scalableValues = [Number, BigInt, Date]

const SortSchema = new duckfficer.Schema({
  type: Object
});

const Sort = {
  settings: {
    required: false,
    autoCast: true
  },
  isSort (o) {
    return Object.keys(o).filter(item => /^\$/.test(item)).length > 0
  },
  cast (v, payload) {
    if (typeof v === 'string') {
      try {
        return JSON.parse(v)
      } catch (err) {}
    }
    return v
  },
  parse (v) {
    if (!Sort.isSort(v)) {
      if (Object.keys(v).length === 0) {
        return v
      }

      return new duckfficer.Schema({ type: Object, mapSchema: 'Query' }, {
        name: this.name,
        parent: this instanceof duckfficer.Schema ? this : undefined
      }).parse(v)
    }

    const operator = Object.keys(v)[0];

    if (!SortSchema.hasField(operator)) {
      const err = `Unknown operator ${operator}`;
      if (this.throwError) {
        this.throwError(err);
      }
      throw new Error(err)
    }

    // console.log(`looking for schema at`, this.fullPath, operator, QuerySchema.schemaAtPath(operator))
    return {
      [operator]: duckfficer.Schema.cloneSchema({
        schema: SortSchema.schemaAtPath(operator),
        name: `${this.fullPath}.${operator}`,
        parent: this instanceof duckfficer.Schema ? this : undefined
      }).parse(v[operator])
    }
  },
  validate (v, { state }) {
    if (v && Sort.isSort(v) && Object.keys(v).length > 1) {
      this.throwError('Invalid sorter');
    }
  }
};

duckfficer.Transformers.Sort = Sort;

duckfficer.Transformers.Password = {
  settings: {
    required: false
  },
  loaders: [String],
  validate (value, { state }) {
    if (state.method === 'create' && !value) {
      this.throwError('Please enter a valid password', { value });
    }
  },
  parse (v, { state }) {
    if (
      state.method === 'create' ||
      (
        state.method === 'update' &&
        duckfficer.Utils.find(state.oldEntry || {}, this.fullPath) !== v
      )
    ) {
      return bcrypt__default['default'].hash(v, 10)
    }
    return v
  }
};

duckfficer.Transformers.ObjectId = {
  settings: {
    unique: true
  },
  async parse (v, { state }) {
    if (objectid.isValid(v)) {
      return objectid(v)
    }

    // TODO: filter (tree shake) at build
    if (this.settings.duckRack) {
      if (!DuckStorage.getRackByName(this.settings.duckRack)) {
        this.throwError(`Could not find rack '${this.settings.duckRack}'`);
      }

      const rawData = Object.assign({}, v);

      // todo: check if consolidated instead if is valid
      //       or maybe make isValid check if raw data is consolidated? :\
      if (state.method === 'create' || state.method === 'update') {
        return objectid(v._id)
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

duckfficer.Transformers.uuid = {
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

const QuerySchema = new duckfficer.Schema({
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
  $where: Object,
  $elemMatch: Object,
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
  async parse (v) {
    if (!Query.isOperator(v)) {
      if (Object.keys(v).length === 0) {
        return v
      }

      return new duckfficer.Schema({ type: Object, mapSchema: 'Query' }, {
        name: this.name,
        parent: this instanceof duckfficer.Schema ? this : undefined
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
      [operator]: await duckfficer.Schema.cloneSchema({
        schema: QuerySchema.schemaAtPath(operator),
        name: `${this.fullPath}.${operator}`,
        parent: this instanceof duckfficer.Schema ? this : undefined
      }).parse(v[operator])
    }
  }
};

duckfficer.Transformers.Query = Query;

const BooleanOrSchema = new duckfficer.Schema({
  type: [Object, Boolean]
}, {
  cast (v) {
    if (typeof v === 'object') {
      return duckfficer.Schema.ensureSchema(v)
    }
    return v
  }
});

const Meth = new duckfficer.Schema({
  data: {
    type: Object,
    default () {
      return {}
    }
  },
  description: {
    type: String,
    required: false
  },
  input: {
    type: BooleanOrSchema,
    required: false
  },
  output: {
    type: BooleanOrSchema,
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

const Methods = new duckfficer.Schema({
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

  async trigger (thisArg, lifeCycle, hookName, payload, rollback = []) {
    const hooksMatched = this
      .hooks
      .filter(({ hookName: givenHookName, lifeCycle: givenLifeCycle }) => {
        return givenHookName === hookName && givenLifeCycle === lifeCycle
      })
      .map(({ cb }) => cb);

    for (const cb of hooksMatched) {
      try {
        await cb.call(thisArg, payload, rollback);
      } catch (error) {
        // todo: throw hook error
        await Promise.all(rollback);
        throw new ErrorHook(error.message, { hookName, lifeCycle, error })
      }
    }
  }
}

// todo: describe the duck proxy

/**
 * @typedef {Object} DuckProxy
 * @return {boolean}
 */

/**
 * Returns true when objB does not match objA
 * @param {Object} objA
 * @param {Object} objB
 * @return {boolean}
 */
const objectHasBeenModified = (objA, objB) => {
  const diff = deepObjectDiff.detailedDiff(objA, objB);
  let modified = false;
  Object.keys(diff).forEach((key) => {
    Object.keys(diff[key]).forEach(prop => {
      if (modified) {
        return
      }

      modified = Object.keys(diff[key][prop]).length > 0;
    });
  });
  return modified
};

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

class MethodError extends Error {
  constructor (message) {
    super(message);
    this.name = 'MethodError';
  }
}

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
    this._methods = methods;
    this.events = events;
    this.name = name;

    this.hooks = new Hooks();

    this.trigger = this.hooks.trigger.bind(this.hooks, this);
    this.hook = this.hooks.hook.bind(this.hooks);

    const $this = this;

    // DuckStorage.registerRack(this)

    this._proxy = new Proxy(this, {
      get (target, key) {
        if (target[key]) {
          return target[key]
        }
        if ($this.methods[key]) {
          return async (...payload) => {
            const inputValidation = $this.methods[key].input ? duckfficer.Schema.ensureSchema($this.methods[key].input) : undefined;
            const outputValidation = $this.methods[key].output ? duckfficer.Schema.ensureSchema($this.methods[key].output) : undefined;

            if (inputValidation && payload.length > 1) {
              throw new DuckRackError(`Only one argument expected at method ${key}`)
            }

            const input = inputValidation ? [await inputValidation.parse(payload[0])] : payload;

            try {
              const result = await $this.methods[key].handler.call($this, ...input);
              return outputValidation ? await outputValidation.parse(result) : result
            } catch (err) {
              throw new DuckRackError(err.message, err)
            }
          }
        }
      }
    });

    return this.init()
  }

  /**
   * Initializes all duck async ops
   * @return {Promise<*>}
   */
  async init () {
    this.methods = await Methods.parse(this._methods);

    return this._proxy
  }

  async dispatch (eventName, payload) {
    const eventKey = camelCase__default['default'](eventName);
    eventName = kebabCase__default['default'](eventName);
    try {
      this.emit(kebabCase__default['default'](eventName), await this.events[eventKey].parse(payload));
    } catch (err) {
      throw new EventError(`${eventName} payload is not valid`)
    }
  }

  get schema () {
    return this.duckModel.schema
  }

  /**
   * Retrieves document by `id` and executes given `method` if found, with given payload. Saves the state of the entry
   * once done
   *
   * @param id
   * @param {String} method
   * @param {Object} state
   * @param {Number} _v - dot notation path
   * @param {String} path - dot notation path
   * @param {Function} validate - validator function that receives the document
   * @param {*} payload
   * @return {Promise<*>}
   */
  async apply ({ id, _v, path = null, method, payload, state = {}, validate }) {
    Object.assign(state, {
      method: 'apply'
    });

    const getQuery = () => {
      if (_v) {
        return {
          _id: objectid(id),
          _v: {
            $eq: _v
          }
        }
      }
      return id
    };

    await this.trigger('before', 'apply', { id, _v, method, path, payload, state });

    const query = getQuery();

    const doc = (await this.find(query))[0];

    if (!doc) {
      throw new Error('document not found')
    }

    if (validate) {
      // custom doc validation
      await validate(doc);
    }

    let error;
    let methodResult;
    let entryResult;

    const trapEvents = (entry) => {
      const trapped = [];
      return {
        get trapped () {
          return trapped
        },
        dispatch (dispatcher) {
          trapped.forEach(({ event, payload }) => {
            dispatcher.emit('method', {
              event,
              path,
              entry,
              payload
            });
          });
        },
        trap (event) {
          entry.$on(event, (...payload) => {
            trapped.push({
              event,
              payload
            });
          });
        }
      }
    };

    const methods = (path ? this.duckModel.schema.schemaAtPath(path) : this.duckModel.schema)._methods;
    const methodEvents = methods[method].events || {};
    const docAtPath = (path ? duckfficer.Utils.find(doc, path) : doc);

    const eventTrapper = trapEvents(docAtPath);

    Object.keys(methodEvents).forEach(eventTrapper.trap);

    try {
      methodResult = await docAtPath[method](payload, { state });
    } catch (err) {
      error = new MethodError(err.message);
    }

    try {
      entryResult = (await this.update(id, get__default['default'](doc, this.duckModel.schema.ownPaths), state))[0];
      eventTrapper.dispatch(this);
    } catch (err) {
      error = err;
    }
    await this.trigger('after', 'apply', { id, _v, method, payload, state, error, methodResult, entryResult, eventsTrapped: eventTrapper.trapped });

    if (error) {
      throw error
    }

    return { methodResult, entryResult, eventsDispatched: eventTrapper.trapped }
  }

  /**
   * @event DuckRack#create
   * @type {Object} - the duck
   */

  /**
   * @param newEntry
   * @param {Object} state - hooks state
   * @return {Promise<*>}
   * @fires {DuckRack#create}
   */

  async create (newEntry = {}, state = {}) {
    if (typeof newEntry !== 'object' || newEntry === null || Array.isArray(newEntry)) {
      throw new Error('An entry must be provided')
    }

    Object.assign(state, {
      method: 'create'
    });

    DuckRack.validateEntryVersion(newEntry);

    const entry = await this.schema.parse(newEntry, { state, virtualsEnumerable: false });

    Object.assign(state, {
      entryProcessed: false
    });

    await this.trigger('before', 'create', { entry, state });
    const entryModel = await this.duckModel.getModel(entry, state);
    const createdEntry = await entryModel.consolidate();
    await this.trigger('after', 'create', { entry: createdEntry, state });
    this.emit('create', { entry: createdEntry, state });

    return createdEntry
  }

  /**
   * Sugar for `find(entityName, { _id: { $eq: _id } })`
   * @param _id
   * @param {Object} state - hooks state
   * @return {Promise<*>}
   */
  async read (_id, state = {}) {
    Object.assign(state, {
      method: 'read'
    });

    const entry = await this.findOneById(_id);
    if (entry) {
      await this.trigger('before', 'read', { entry, state });
      const recoveredEntry = await this.duckModel.schema.parse(cloneDeep__default['default'](entry), {
        state
      });
      await this.trigger('after', 'read', { entry: recoveredEntry, state });

      return recoveredEntry
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

  async update (query, newEntry, state = {}) {
    Object.assign(state, {
      method: 'update'
    });

    const entries = (await this.find(query, state, true)).map(oldEntry => {
      if (newEntry && newEntry._id && !objectid(oldEntry._id).equals(newEntry._id)) {
        throw new Error('_id\'s cannot be modified')
      }

      if (newEntry && newEntry._v && newEntry._v !== oldEntry._v) {
        throw new Error('Entry version mismatch')
      }

      return oldEntry
    });

    const newEntries = [];

    for (const oldEntry of entries) {
      Object.assign(state, { oldEntry });
      const composedNewEntry = Object.assign(cloneDeep__default['default'](oldEntry), newEntry);

      const entry = await this.schema.parse(composedNewEntry, { state });

      if (!objectHasBeenModified(oldEntry, entry)) {
        newEntries.push(oldEntry);
        continue
      }

      newEntry._v = entry._v = oldEntry._v + 1;
      const result = [];

      await this.trigger('before', 'update', { oldEntry, newEntry, entry, state, result });
      this.emit('update', { oldEntry, newEntry, entry });
      await this.trigger('after', 'update', { oldEntry, newEntry, entry, state, result });

      if (result.length > 0) {
        newEntries.push(...result);
      }
    }

    return Promise__default['default'].map(newEntries, entry => this.schema.parse(entry))
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

  async delete (query, state = {}) {
    Object.assign(state, {
      method: 'delete'
    });

    await this.trigger('before', 'deleteMultiple', { query, state });

    const entriesToRemove = await this.find(query);
    const removedEntries = [];

    for (const entry of entriesToRemove) {
      if (await this.deleteById(entry._id)) {
        removedEntries.push(entry);
        this.emit('delete', entry);
      }
    }

    await this.trigger('after', 'deleteMultiple', { query, result: removedEntries, state });

    return removedEntries
  }

  async deleteById (_id, state = {}) {
    this.validateId(_id);
    Object.assign(state, {
      method: 'deleteById'
    });

    const result = [];

    await this.trigger('before', 'deleteById', { _id, state, result });
    await this.trigger('after', 'deleteById', { _id, state, result });

    return result[0]
  }

  consolidateDoc (state) {
    return async (doc) => {
      const entry = await this.duckModel.getModel(doc, state);
      return entry.consolidate({ virtualsEnumerable: true })
    }
  }

  async list (query, sort, state = {}) {
    Object.assign(state, {
      method: 'list'
    });

    const entries = await this.find(query, state);

    if (!sort) {
      return entries
    }

    const sortArray = (arr, sort) => {
      const toIndex = (value) => {
        if (typeof value === 'boolean') {
          return value ? 1 : -1
        }
        return value
      };
      const calcIndex = (a, b, factor = 1) => {
        if (a === b) {
          return 0
        }

        if (typeof a === 'string' && typeof b === 'string') {
          return toIndex(a > b) * factor
        }
        const A = toIndex(a);
        const B = toIndex(b);

        return (A - B) * factor
      };

      duckfficer.Utils.obj2dot(sort).reverse().forEach(prop => {
        arr = arr.sort((a, b) => {
          return calcIndex(duckfficer.Utils.find(a, prop), duckfficer.Utils.find(b, prop), toIndex(duckfficer.Utils.find(sort, prop)))
        });
      });
      return arr
    };

    return sortArray(entries, sort)
  }

  validateId () {
    // todo: validate id type / value
    return true
  }

  async entryExists (_id) {
    this.validateId(_id);
    return this.storeKey[_id] !== undefined
  }

  async findOneById (_id, state = {}, raw = false) {
    Object.assign(state, {
      method: 'findOneById'
    });

    const queryInput = {
      _id: objectid(_id)
    };

    const result = [];

    // todo: remove before / after states as they may not be needed any more
    await this.trigger('before', 'findOneById', { _id, queryInput, state, result });

    await this.trigger('after', 'findOneById', { _id, queryInput, result, state });
    return result[0]
  }

  // todo: add limits
  async find (queryInput = {}, state = {}, raw = false) {
    Object.assign(state, {
      method: 'find'
    });

    // todo: run hooks
    if (objectid.isValid(queryInput)) {
      queryInput = {
        _id: objectid(queryInput)
      };
    }

    const result = [];

    await this.trigger('before', 'find', { query: queryInput, raw, state, result });
    await this.trigger('after', 'find', { query: queryInput, raw, state, result });

    return raw ? result : Promise__default['default'].map(result, this.consolidateDoc(state))
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

const { PromiseEach } = duckfficer.Utils;

class DuckStorageClass extends events.EventEmitter {
  constructor () {
    super();
    this.store = Object.create(null);
    this.plugins = [loadReference, uniqueKeys, lock()];
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
    rack.on('method', (payload) => {
      this.emit('method', {
        entityName: rack.name,
        payload
      });
    });
  }

  async init (name, model, { methods, events } = {}) {
    const duckRack = await new DuckRack(name, {
      duckModel: model,
      methods,
      events
    });
    await this.registerRack(duckRack);
    return duckRack
  }

  plugin (fn) {
    this.plugins.push(fn);
  }

  /**
   * Registers given DuckRack
   * @param {DuckRack} duckRack
   * @return {DuckRack}
   */
  async registerRack (duckRack) {
    // todo: how about makking this function async?
    if (this.store[duckRack.name]) {
      throw new Error(`a DuckRack with the name ${duckRack.name} is already registered`)
    }

    this.store[duckRack.name] = duckRack;
    await PromiseEach(this.plugins, fn => {
      return fn({ DuckStorage: this, duckRack })
    });
    this._wireRack(duckRack);
    return duckRack
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
  toObject (doc, state = {}, virtualsEnumerable = false) {
    return this.schema.parse(Object.assign({}, doc), { state, virtualsEnumerable })
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
    inlineStructureValidation = true
  } = {}) {
    super();
    const originalSchema = duckfficer.Schema.ensureSchema(schema);
    this.originalSchema = originalSchema;

    schema = duckfficer.Schema.cloneSchema({ schema: originalSchema });

    if (schema.hasField('_id')) {
      throw new Error('_id is reserved for the duck')
    }

    if (schema.hasField('_v')) {
      throw new Error('_v is reserved for the duck')
    }

    const _id = new duckfficer.Schema(idType, {
      name: '_id',
      settings: {
        required: false,
        default () {
          return objectid().toHexString()
        }
      }
    });

    const _v = new duckfficer.Schema({
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
  async getModel (defaultValues = {}, state = {}) {
    const $this = this;
    const data = {};
    let consolidated = await this.schema.isValid(defaultValues);

    const consolidate = async ({ virtualsEnumerable = false } = {}) => {
      const dataConsolidated = await this.schema.parse(data, { virtualsEnumerable, state });
      consolidated = true;
      return dataConsolidated
    };

    await duckfficer.Utils.PromiseEach(this.schema.paths, async path => {
      const def = this.schema.schemaAtPath(path).settings.default;
      const defaultValue = defaultValues[path] || (def ? (typeof def === 'function' ? await def() : def) : undefined);

      if (defaultValue !== undefined || deeplyRequired(this.schema, path)) {
        set__default['default'](data, path, defaultValue);
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
        const parentObj = parentPath ? duckfficer.Utils.find(data, finalPath) : data;

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
        };

        // virtuals (getters / setters)
        const virtual = getVirtual();

        if (virtual) {
          return virtual.getter.call(parentPath ? duckfficer.Utils.find(data, parentPath) : data)
        }

        try {
          $this.schema.structureValidation(obj);
        } catch ({ errors }) {
          throw errors[0]
        }

        // deliver primitive value (or final value in the schema path)
        if (!$this.schema.schemaAtPath(finalPath).hasChildren) {
          return duckfficer.Utils.find(data, finalPath)
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
          virtual.setter.call(parentPath ? duckfficer.Utils.find(data, parentPath) : data, value);
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

        return set__default['default'](data, finalPath, value)
      }
    });

    return theModelProxy
  }
}

/**
 * Register multiple DuckModels at once in DuckRack's
 * @param {Object} duckRacks - an object mapping Duck's
 * @return {DuckRack[]}
 */
async function registerDuckRacksFromObj (duckRacks) {
  return Promise__default['default'].map(Object.keys(duckRacks), async (rackName) => {
    const { duckModel: duckModelPayload, methods = {} } = duckRacks[rackName];
    const { schema: theSchema, methods: theMethods = {} } = duckModelPayload;

    const getSchema = () => {
      if (theSchema instanceof duckfficer.Schema) {
        // todo: if 'methods' exists, throw an error!
        return theSchema
      }

      return new duckfficer.Schema(theSchema, {
        methods: theMethods
      })
    };

    const schema = getSchema();

    const duckModel = duckModelPayload instanceof Duck ? duckModelPayload : new Duck({ schema });
    const duckRack = await new DuckRack(rackName, { duckModel, methods });
    return DuckStorage.registerRack(duckRack)
  })
}

async function registerDuckRacksFromDir (directory) {
  return registerDuckRacksFromObj(await jsDirIntoJson.jsDirIntoJson(directory, {
    extensions: ['!lib', '!__tests__', '!*.unit.js', '!*.test.js', '*.js', '*.mjs']
  }))
}

exports.Duckfficer = duckfficer__namespace;
exports.Duck = Duck;
exports.DuckRack = DuckRack;
exports.DuckStorage = DuckStorage;
exports.registerDuckRacksFromDir = registerDuckRacksFromDir;
exports.registerDuckRacksFromObj = registerDuckRacksFromObj;
