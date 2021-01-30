import test from 'ava'
import { registerDuckRacksFromObj } from './register-duck-racks-from-obj'
import { DuckStorageClass } from './duck-storage.js'
import inMemory from './plugins/in-memory-db.js'

test('register multiple ducks from an object mapping duck-models', async t => {
  const duckRacks = await registerDuckRacksFromObj(await new DuckStorageClass({
    setupIpc: false,
    plugins: [inMemory]
  }), {
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
  const consolidatedModel = await userModel.consolidate()

  consolidatedModel.log('yup')
  t.deepEqual(consolidatedModel.logs, ['yup'])
  t.snapshot(duckRacks)
})
