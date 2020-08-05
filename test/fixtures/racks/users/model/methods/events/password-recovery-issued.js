export default {
  email: String,
  date: {
    type: Date,
    default () {
      return new Date()
    }
  }
}
