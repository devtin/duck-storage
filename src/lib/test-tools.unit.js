import test from 'ava'
import { Schema } from 'duckfficer'
import { schemaDuckMonitor } from './test-tools'

test('checks all events emitted by a duck', t => {
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
})
