import test from 'ava'
import { registerDuckRacksFromObj } from './register-duck-racks-from-obj'

test('register multiple ducks from an object mapping duck-models', async t => {
  const duckRacks = await registerDuckRacksFromObj({
    user: {
      duckModel: {
        schema: {
          fullName: String,
          password: String,
          logs: {
            type: Array,
            default () {
              return []
            }
          }
        },
        methods: {
          log (someInput) {
            this.$field.logs.push(someInput)
          }
        }
      }
    }
  })

  t.true(Array.isArray(duckRacks))
  const userModel = await duckRacks[0].duckModel.getModel()
  userModel.fullName = 'Martin'
  userModel.password = '123'
  await t.notThrowsAsync(() => userModel.consolidate())
  userModel.log('yup')
  t.deepEqual(userModel.logs, ['yup'])
  t.snapshot(duckRacks)
})
