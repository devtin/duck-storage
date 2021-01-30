const { DuckStorageClass, plugins: { InMemory }, DuckRack, Duck } = require('../../../')

let DuckStorage
const UserModel = new Duck({
  schema: {
    firstName: String,
    lastName: String,
    get fullName () {
      return `${this.firstName} ${this.lastName}`
    }
  }
})

new DuckStorageClass({
  plugins: [InMemory()]
}).then(async instance => {
  const UserRack = await new DuckRack('users', {
    duckModel: UserModel
  })
  DuckStorage = instance
  DuckStorage.registerRack(UserRack)
  process.send('done')
})
