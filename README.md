<p><img width="480" src="https://repository-images.githubusercontent.com/284732527/2b28a880-d57b-11ea-9b43-283e2cdd605c"/></p>

<div><h1>duck-storage</h1></div>

<p>
    <a href="https://www.npmjs.com/package/duck-storage" target="_blank"><img src="https://img.shields.io/npm/v/duck-storage.svg" alt="Version"></a>
<a href="http://opensource.org/licenses" target="_blank"><img src="http://img.shields.io/badge/License-MIT-brightgreen.svg"></a>
</p>

<p>
    storage for schematized data objects
</p>

## Installation

```sh
$ npm i duck-storage --save
# or
$ yarn add duck-storage
```

## Features

- [stores schematized ducks](#stores-schematized-ducks)
- [finds a duck](#finds-a-duck)
- [updates information of a duck](#updates-information-of-a-duck)
- [updates information of multiple ducks at a time](#updates-information-of-multiple-ducks-at-a-time)
- [removes ducks from the rack](#removes-ducks-from-the-rack)
- [lists ducks in the rack](#lists-ducks-in-the-rack)
- [loads references of ducks in other racks](#loads-references-of-ducks-in-other-racks)
- [defines duck rack methods](#defines-duck-rack-methods)
- [validates properties in realtime](#validates-properties-in-realtime)
- [registers duck racks from given dir](#registers-duck-racks-from-given-dir)
- [checks all events emitted by a duck](#checks-all-events-emitted-by-a-duck)


<a name="stores-schematized-ducks"></a>

## stores schematized ducks


```js
const createEvent = forEvent(Rack, 'create')
const entry = await Rack.create({
  firstName: 'Martin',
  lastName: 'Rafael'
})

t.truthy(entry)
t.true(Object.prototype.hasOwnProperty.call(entry, '_id'))
t.true(Object.prototype.hasOwnProperty.call(entry, '_v'))
t.is(entry.fullName, 'Martin Rafael')

const createEventPayload = (await createEvent)[0]

t.truthy(createEvent)
t.deepEqual(createEventPayload, entry)

entry.fullName = 'Pedro Perez'

t.is(entry.firstName, 'Pedro')
t.is(entry.lastName, 'Perez')
```

<a name="finds-a-duck"></a>

## finds a duck


```js
const entry = await Rack.create({
  firstName: 'Martin'
})

const found = await Rack.read(entry._id)
t.deepEqual(entry.toObject(), found.toObject())
t.not(entry, found)
```

<a name="updates-information-of-a-duck"></a>

## updates information of a duck


```js
const updateEvent = forEvent(Rack, 'update')
const created = (await Rack.create({
  firstName: 'Martin',
  lastName: 'Gonzalez'
})).consolidate()

const toUpdate = {
  firstName: 'Olivia'
}
const updated = await Rack.update({ lastName: { $eq: 'Gonzalez' } }, toUpdate)

const updatePayload = (await updateEvent)[0]

t.truthy(updatePayload)
t.deepEqual(updatePayload.oldEntry, created)
t.deepEqual(updatePayload.newEntry, toUpdate)
t.deepEqual(updatePayload.entry, updated[0])

t.true(Array.isArray(updated))
t.is(updated.length, 1)
t.is(updated[0].firstName, 'Olivia')
t.is(updated[0].lastName, 'Gonzalez')
t.is(updated[0]._v, 2)

const updatedEntry = await Rack.read(created._id)
t.is(updatedEntry.firstName, 'Olivia')
```

<a name="updates-information-of-multiple-ducks-at-a-time"></a>

## updates information of multiple ducks at a time


```js
const updateEvent = forEvent(Rack, 'update', { trap: 2 })

const martin = (await Rack.create({
  firstName: 'Martin',
  lastName: 'Gonzalez'
})).toObject()

const ana = (await Rack.create({
  firstName: 'Ana',
  lastName: 'Sosa'
})).toObject()

const toUpdate = {
  firstName: 'Olivia'
}

const updated = await Rack.update({}, toUpdate)

t.true(Array.isArray(updated))

t.is(updated.length, 2)
t.is(updated[0]._id, martin._id)
t.is(updated[0].firstName, 'Olivia')
t.is(updated[0].lastName, 'Gonzalez')
t.is(updated[0]._v, 2)

t.is(updated[1]._id, ana._id)
t.is(updated[0].firstName, 'Olivia')
t.is(updated[0].lastName, 'Gonzalez')
t.is(updated[0]._v, 2)

const updatePayload = await updateEvent

t.truthy(updatePayload)

t.deepEqual(updatePayload[0].oldEntry, martin)
t.deepEqual(updatePayload[0].newEntry, toUpdate)
t.deepEqual(updatePayload[0].entry, updated[0])

t.deepEqual(updatePayload[1].oldEntry, ana)
t.deepEqual(updatePayload[1].newEntry, toUpdate)
t.deepEqual(updatePayload[1].entry, updated[1])
```

<a name="removes-ducks-from-the-rack"></a>

## removes ducks from the rack


```js
const deleteEvent = forEvent(Rack, 'delete')
const entry = await Rack.create({
  firstName: 'Martin',
  lastName: 'Gonzalez'
})
const deleted = await Rack.delete({
  _id: {
    $eq: entry._id
  }
})
const deletedPayload = (await deleteEvent)[0]

t.deepEqual(deletedPayload, deleted[0])

t.true(Array.isArray(deleted))
t.is(deleted.length, 1)
t.is(deleted[0]._id, entry._id)
t.is(deleted[0].firstName, 'Martin')
t.is(deleted[0].lastName, 'Gonzalez')

const notFound = await Rack.read({ _id: { $eq: entry._id } })
t.is(notFound, undefined)
t.is(Object.keys(Rack.storeKey).length, 0)
```

<a name="lists-ducks-in-the-rack"></a>

## lists ducks in the rack


```js
const entry1 = (await Rack.create({
  firstName: 'Martin',
  lastName: 'Gonzalez'
})).toObject()

const entry2 = (await Rack.create({
  firstName: 'Olivia',
  lastName: 'Gonzalez'
})).toObject()

const res = await Rack.list()
t.true(Array.isArray(res))
t.is(res.length, 2)
t.deepEqual(res.map(entry => entry.consolidate()), [entry1, entry2])
```

<a name="loads-references-of-ducks-in-other-racks"></a>

## loads references of ducks in other racks


```js
const orderSchema = new Schema({
  customer: {
    type: 'ObjectId',
    duckRack: 'customer'
  },
  amount: {
    type: Number,
    integer: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})
const customerSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String
})

const OrderModel = new Duck({ schema: orderSchema })
const CustomerModel = new Duck({ schema: customerSchema })

const OrderBucket = new DuckRack('order', {
  duckModel: OrderModel
})

OrderBucket.hook('before', 'create', function (entry) {
  return entry
})

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

OrderBucket.hook('after', 'read', loadReferences)
OrderBucket.hook('after', 'create', loadReferences)

const CustomerBucket = new DuckRack('customer', {
  duckModel: CustomerModel
})

const customer = await CustomerBucket.create({
  firstName: 'Martin',
  lastName: 'Rafael',
  email: 'tin@devtin.io'
})

t.truthy(customer._id)

// console.log({ customer })
// console.log(CustomerModel.schema.parse(customer))

try {
  await OrderModel.schema.parse({
    customer,
    amount: 100
  })
} catch (err) {
  console.log('\n\nERROR\n\n', err)
  throw err
}

const order = await OrderBucket.create({
  customer,
  amount: 100
})

t.deepEqual(order.customer, customer.consolidate())

const readOrder = await OrderBucket.read(order._id)
t.deepEqual(readOrder.customer, customer.consolidate())
```

<a name="defines-duck-rack-methods"></a>

## defines duck rack methods


```js
const userSchema = new Schema({
  name: String,
  level: String
})
const userDuckModel = new Duck({ schema: userSchema })
const UserRack = new DuckRack('some-user', {
  duckModel: userDuckModel,
  methods: {
    changeLevel: {
      input: {
        userId: 'ObjectId',
        newLevel: String
      },
      async handler ({ userId, newLevel }) {
        const user = await this.findOneById(userId)
        user.level = newLevel
        return this.update(userId, user)
      }
    },
    getAdmins () {
      return this.list({
        level: {
          $eq: 'admin'
        }
      })
    },
    getUsers () {
      return this.list({
        level: {
          $eq: 'user'
        }
      })
    }
  }
})

await UserRack.create({
  name: 'Martin',
  level: 'admin'
})

await UserRack.create({
  name: 'Rafael',
  level: 'admin'
})

await UserRack.create({
  name: 'Pedro',
  level: 'user'
})

const admins = await UserRack.getAdmins()
t.truthy(admins)
t.is(admins.length, 2)

const users = await UserRack.getUsers()
t.truthy(users)
t.is(users.length, 1)

UserRack.changeLevel({
  userId: admins[0]._id,
  newLevel: 'user'
})
```

<a name="validates-properties-in-realtime"></a>

## validates properties in realtime


```js
const duckModel = Duck.create({ schema: AdvancedSchema })
let err

err = t.throws(() => { return duckModel.dont.do.this.to.me })
t.is(err.message, 'Unknown property dont')

err = t.throws(() => { duckModel.firstName = 123 })
t.is(err.message, 'Invalid string')

err = t.throws(() => { duckModel.address.zip = '33q29' })
t.is(err.message, 'Invalid number')

err = t.throws(() => { duckModel.email = 'martin' })
t.is(err.message, 'Invalid e-mail address')

t.notThrows(() => { duckModel.firstName = 'Martin' })
t.notThrows(() => { duckModel.lastName = 'Rafael' })
t.notThrows(() => { duckModel.email = 'tin@devtin.io' })
t.notThrows(() => { duckModel.address.line1 = 'Brickell' })
t.notThrows(() => { duckModel.address.zip = 305 })

t.is(duckModel.firstName, 'Martin')
t.is(duckModel.lastName, 'Rafael')
t.is(duckModel.email, 'tin@devtin.io')
t.is(duckModel.address.line1, 'Brickell')
t.is(duckModel.address.zip, 305)

err = t.throws(() => duckModel.getEmailDomain())
t.is(err.message, 'consolidate the model prior invoking method getEmailDomain')

duckModel.consolidate()

t.truthy(duckModel._id)
t.is(duckModel.getEmailDomain(), 'devtin.io')

t.deepEqual(duckModel.toObject(), {
  _id: duckModel._id,
  _v: 1,
  firstName: 'Martin',
  lastName: 'Rafael',
  email: 'tin@devtin.io',
  address: {
    line1: 'Brickell',
    zip: 305
  }
})
```

<a name="registers-duck-racks-from-given-dir"></a>

## registers duck racks from given dir




<a name="checks-all-events-emitted-by-a-duck"></a>

## checks all events emitted by a duck


```js
const User = new Schema({
  name: String,
  emails: {
    type: Array,
    default () {
      return []
    }
  }
}, {
  methods: {
    addEmail: {
      events: {
        emailAdded: String
      },
      input: String,
      handler (email) {
        this.$field.emails.push(email)
        this.$emit('emailAdded', email)
      }
    }
  }
})

const userPayload = User.parse({
  name: 'Martin'
})

const eventsFired = schemaDuckMonitor(User, userPayload)

t.is(eventsFired.length, 0)
userPayload.addEmail('martin')
t.is(eventsFired.length, 1)
```


<br><a name="DuckRack"></a>

### DuckRack
**Description:**

Stores only ducks specified by the `duckModel`


<br><a name="DuckRack+read"></a>

#### duckRack.read(_id) ⇒ <code>Promise.&lt;\*&gt;</code>

| Param |
| --- |
| _id | 

**Description:**

Sugar for `find(entityName, { _id: { $eq: _id } })`


<br><a name="Duck"></a>

### Duck
**Description:**

A duck model


* [Duck](#Duck)
    * _instance_
        * [.getModel([defaultValues], [state])](#Duck+getModel) ⇒ <code>Object</code>
    * _static_
        * [.create(duckPayload, [...modelPayload])](#Duck.create) ⇒ <code>Object</code>


<br><a name="Duck+getModel"></a>

#### duck.getModel([defaultValues], [state]) ⇒ <code>Object</code>

| Param | Type |
| --- | --- |
| [defaultValues] | <code>Object</code> | 
| [state] | <code>Object</code> | 

**Returns**: <code>Object</code> - the duck proxy model  
**Description:**

Prepares a duck proxy model to be used with the defined schema


<br><a name="Duck.create"></a>

#### Duck.create(duckPayload, [...modelPayload]) ⇒ <code>Object</code>

| Param | Type | Description |
| --- | --- | --- |
| duckPayload | <code>Object</code> | the duck constructor payload |
| [...modelPayload] |  | the model payload |

**Returns**: <code>Object</code> - the duck proxy model  
**Description:**

Sugar for calling `new Duck({...}).getModel()`


<br><a name="schemaDuckMonitor"></a>

### schemaDuckMonitor ⇒ <code>Array</code>

| Param | Type |
| --- | --- |
| schema | <code>Object</code> | 
| payload | <code>Object</code> | 

**Returns**: <code>Array</code> - an array with all of the events fired  
**Description:**

Logs all events emitted by a duck


* * *

### License

[MIT](https://opensource.org/licenses/MIT)

&copy; 2020-present Martin Rafael Gonzalez <tin@devtin.io>
