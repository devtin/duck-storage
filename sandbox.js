const { ModelRepository, Model, Schema } = require('./')

const TransactionsModel = new Model({
  customerId: {
    type: 'ObjectId',
    required: true
  },
  price: Number
})

const CustomerModel = new Model({
  firstName: {
    type: String,
    minlength: [2, 'Invalid firstName']
  },
  lastName: {
    type: String,
    minlength: [2, 'Invalid lastName']
  },
  email: String,
  phoneNumber: Number,
}, {
  virtuals: {
    fullName: {
      get () {
        return this.firstName + ' ' + this.lastName
      }
    },
    contact: {
      get () {
        return `${this.fullName} <${this.email}>`
      }
    }
  }
})

const Customer = new ModelRepository('customers', {
  model: CustomerModel
})

const Transactions = new ModelRepository('transactions', {
  model: TransactionsModel,
  events: {
    newOrder: new Schema({
      id: 'ObjectId',
      customerId: 'ObjectId',
      createdAt: Date
    })
  },
  methods: {
    newPurchase: {
      schema: {
        customerId: 'ObjectId',
        price: Number
      },
      async handler (payload) {
        const order = await this.create(payload)
        this.dispatch('new-order', {
          id: order._id,
          customerId: payload.customerId,
          createdAt: new Date()
        })
        this.emit('newOrder', order)
        return order
      }
    }
  }
})

Customer.on('create', (user) => {
  console.log('Sending welcome e-mail', user.fullName, user.email)
})

Customer.create({
  firstName: 'Martin',
  lastName: 'Gonzalez',
  email: 'marting.dc@gmail.com'
}).then(async (user) => {
  const transaction = await Transactions.newPurchase({
    customerId: user._id,
    price: 1000
  })
  await Transactions.update({
    _id: {
      $eq: transaction._id
    }
  }, {
    price: 1200
  })
  console.log({ transaction })
})

Transactions.on('new-order', async transaction => {
  console.log({ transaction })
  const customer = await Customer.findOneById(transaction.customerId)
  console.log('emailing transaction to customer', customer.email)
})

Transactions.on('update', (updated) => {
  console.log('transaction updated', { updated })
})
