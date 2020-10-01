import { Duck } from './duck'
import { DuckRack } from './duck-rack'
import { Schema } from 'duckfficer'
import test from 'ava'
import { DuckStorage } from './duck-storage'
import Promise from 'bluebird'

const forEvent = (instance, eventName, { timeout = 2000, trap = 1 } = {}) => {
  const trapped = []
  return new Promise((resolve, reject) => {
    instance.on(eventName, (...args) => {
      trapped.push(...args)
      if (trapped.length === trap) {
        resolve(trapped)
      }
    })
    setTimeout(reject, timeout)
  })
}

let Address

let ContactModel

let Rack

test.before(async () => {
  Address = new Schema({
    line1: String,
    line2: String,
    zip: Number,
    get fullAddress () {
      return `${this.line1} / ${this.line2} / ${this.zip}`
    }
  })

  ContactModel = await new Duck({
    schema: {
      firstName: String,
      lastName: {
        type: String,
        required: false
      },
      get fullName () {
        return this.firstName + ' ' + this.lastName
      },
      set fullName (v) {
        const [firstName, lastName] = v.split(/\s+/)
        this.firstName = firstName
        this.lastName = lastName
      },
      address: {
        type: Address,
        required: false
      }
    }
  })

  Rack = await new DuckRack('some-rack-name', {
    duckModel: ContactModel
  })
})

test.beforeEach(async () => {
  return Rack.delete({})
})

test('stores schematized ducks', async t => {
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
})

test('finds a duck', async t => {
  const entry = await Rack.create({
    firstName: 'Martin'
  })

  const found = await Rack.read(entry._id)

  t.deepEqual(entry, found)
  t.not(entry, found)
})

test('updates information of a duck', async t => {
  const updateEvent = forEvent(Rack, 'update')
  const created = await Rack.create({
    firstName: 'Martin',
    lastName: 'Gonzalez'
  })

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
  t.is(updatedEntry.fullName, 'Olivia Gonzalez')
})

test('updates information of multiple ducks at a time', async t => {
  const updateEvent = forEvent(Rack, 'update', { trap: 2 })

  const martin = await Rack.create({
    firstName: 'Martin',
    lastName: 'Gonzalez'
  })

  const ana = await Rack.create({
    firstName: 'Ana',
    lastName: 'Sosa'
  })

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
})

test('removes ducks from the rack', async t => {
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
})

test('lists ducks in the rack', async t => {
  const entry1 = await Rack.create({
    firstName: 'Martin',
    lastName: 'Gonzalez'
  })

  const entry2 = await Rack.create({
    firstName: 'Olivia',
    lastName: 'Gonzalez'
  })

  const res = await Rack.list()
  t.true(Array.isArray(res))
  t.is(res.length, 2)
  t.deepEqual(res, [entry1, entry2])
})

test('sorts ducks in a rack by custom properties', async t => {
  const ana = await Rack.create({
    firstName: 'Ana',
    lastName: 'Sosa',
    address: {
      line1: 'Brickell Ave',
      line2: 'Miami',
      zip: 33129
    }
  })

  const olivia = await Rack.create({
    firstName: 'Olivia',
    lastName: 'Gonzalez',
    address: {
      line1: 'Brickell Ave',
      line2: 'Miami',
      zip: 33129
    }
  })

  const martin = await Rack.create({
    firstName: 'Martin',
    lastName: 'Gonzalez',
    address: {
      line1: 'Brickell Ave',
      line2: 'Miami',
      zip: 33129
    }
  })

  const ruth = await Rack.create({
    firstName: 'Ruth',
    lastName: 'Marquez',
    address: {
      line1: '11916 SW 154th Ave',
      line2: 'Kendall',
      zip: 33196
    }
  })

  const res = await Rack.list({}, {
    firstName: -1
  })

  t.deepEqual(res, [ruth, olivia, martin, ana])

  const res2 = await Rack.list({}, {
    lastName: -1,
    firstName: 1
  })

  t.deepEqual(res2, [ana, ruth, martin, olivia])

  const res3 = await Rack.list({}, {
    address: {
      zip: -1
    }
  })

  t.deepEqual(res3, [ruth, ana, olivia, martin])

  const res4 = await Rack.list({}, {
    address: {
      line2: 1
    },
    firstName: 1
  })

  t.deepEqual(res4, [ruth, ana, martin, olivia])
})

test('loads references of ducks in other racks', async t => {
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

  const OrderRack = await new DuckRack('order', {
    duckModel: OrderModel
  })

  const CustomerRack = await new DuckRack('customer', {
    duckModel: CustomerModel
  })

  DuckStorage.registerRack(OrderRack)
  DuckStorage.registerRack(CustomerRack)

  const customer = await CustomerRack.create({
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

  const order = await OrderRack.create({
    customer,
    amount: 100
  })

  t.deepEqual(order.customer, customer)

  const readOrder = await OrderRack.read(order._id)
  t.deepEqual(readOrder.customer, customer)
})

test('defines duck rack methods', async t => {
  const userSchema = new Schema({
    name: String,
    level: String
  })
  const userDuckModel = new Duck({ schema: userSchema })
  const UserRack = await new DuckRack('some-user', {
    duckModel: userDuckModel,
    methods: {
      changeLevel: {
        description: 'What the method does',
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

  await t.notThrowsAsync(() => UserRack.changeLevel({
    userId: admins[0]._id,
    newLevel: 'user'
  }))
})

test('apply calls a method in the model and mutates the state if everything goes smooth', async t => {
  const User = new Schema({
    firstName: String,
    lastName: String,
    logs: {
      type: Array,
      default () {
        return []
      }
    }
  }, {
    methods: {
      log: {
        input: String,
        events: {
          logAdded: {
            date: Date,
            log: String
          }
        },
        handler (log) {
          const logToAdd = {
            date: new Date(),
            log
          }
          this.$field.logs.push(logToAdd)
          this.$emit('logAdded', logToAdd)
          return this.$field.logs
        }
      }
    }
  })

  const UserDuck = new Duck({ schema: User })
  const UserRack = await new DuckRack('user', { duckModel: UserDuck })

  const martin = await UserRack.create({
    firstName: 'Martin',
    lastName: 'Gonzalez'
  })

  let eventCalled = false

  UserRack.on('method', ({ event, entry, payload }) => {
    eventCalled = true
    t.is(event, 'logAdded')
    t.truthy(entry)
    t.truthy(payload)
  })

  const response = await UserRack.apply({
    id: martin._id,
    method: 'log',
    payload: 'some log'
  })

  t.truthy(response.methodResult)
  t.truthy(response.entryResult)
  t.truthy(response.eventsDispatched)

  const updatedMartin = await UserRack.read(martin._id)
  t.is(updatedMartin.logs[0].log, 'some log')
  t.is(updatedMartin._v, 2)
  t.true(eventCalled)
})
