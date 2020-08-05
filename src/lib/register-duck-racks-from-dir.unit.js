import test from 'ava'
import { registerDuckRacksFromDir } from './register-duck-racks-from-dir'
import path from 'path'

test('registers duck racks from given dir', async t => {
  const racks = await registerDuckRacksFromDir(path.join(__dirname, '../../test/fixtures/racks'))
  t.truthy(racks)
  t.is(Object.keys(racks).length, 2)
  t.snapshot(racks)
})
