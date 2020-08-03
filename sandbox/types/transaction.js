export default {
  artist: {
    type: 'ObjectId',
    required: true,
    bucket: 'artist'
  },
  customer: {
    type: 'ObjectId',
    required: true,
    bucket: 'customer'
  },
  price: {
    type: Number,
    integer: true
  },
  paymentStatus: {
    type: String,
    enum: [
      'pending',
      'processing',
      'rejected',
      'approved',
      'refunded',
      'error'
    ]
  },
  shippingStatus: {
    type: String,
    enum: [
      'preparing',
      'shipped',
      'delivered',
      'returning',
      'returned'
    ]
  },
  get status () {
    if (this.paymentStatus === 'approved') {
      return this.shippingStatus
    }

    return this.paymentStatus
  },
  log: {
    type: Array
  }
}
