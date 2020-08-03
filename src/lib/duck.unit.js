import { Duck } from './duck'
import { Schema } from '@devtin/schema-validator'
import test from 'ava'

const Email = new Schema({
  type: String,
  regex: [/^[a-z0-9._+]+@[a-z0-9.-]+\.[a-z]{2,}$/, 'Invalid e-mail address']
})

const Address = new Schema({
  line1: String,
  line2: {
    type: String,
    required: false
  },
  zip: Number
})

const AdvancedSchema = new Schema({
  firstName: String,
  lastName: {
    type: String,
    required: false
  },
  email: Email,
  address: Address
}, {
  methods: {
    getEmailDomain () {
      return this.$field.email.replace(/^[^@]+@/, '')
    }
  }
})

test('validates properties in realtime', t => {
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
})
