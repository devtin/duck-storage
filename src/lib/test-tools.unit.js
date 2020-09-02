import test from 'ava'
import { Schema } from 'duckfficer'
import { schemaDuckMonitor } from './test-tools'

test('checks all events emitted by a duck', async t => {
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
        async handler (email) {
          this.$field.emails.push(email)
          await this.$emit('emailAdded', email)
        }
      }
    }
  })

  const userPayload = await User.parse({
    name: 'Martin'
  })

  const eventsFired = schemaDuckMonitor(User, userPayload)

  t.is(eventsFired.length, 0)
  await userPayload.addEmail('martin')
  t.is(eventsFired.length, 1)
})
