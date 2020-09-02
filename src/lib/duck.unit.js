import { Duck } from './duck'
import { Schema } from 'duckfficer'
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

test('validates properties at consolidation', async t => {
  const duckModel = await Duck.create({ schema: AdvancedSchema })
  let err

  err = t.throws(() => { return duckModel.dont.do.this.to.me })

  t.is(err.message, 'Unknown property dont')

  t.notThrows(() => { duckModel.firstName = 123 })
  t.notThrows(() => { duckModel.address.zip = '33q29' })
  t.notThrows(() => { duckModel.email = 'martin' })

  err = await t.throwsAsync(() => duckModel.consolidate())

  t.is(err.message, 'Data is not valid')
  t.is(err.errors.length, 4)
  t.is(err.errors[0].message, 'Invalid string')
  t.is(err.errors[1].message, 'Invalid e-mail address')
  t.is(err.errors[2].message, 'Property address.line1 is required')
  t.is(err.errors[3].message, 'Invalid number')

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

  await duckModel.consolidate()

  t.truthy(duckModel._id)
  t.is(await duckModel.getEmailDomain(), 'devtin.io')

  t.deepEqual(await duckModel.toObject(), {
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
