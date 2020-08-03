export default {
  firstName: {
    type: String,
    minlength: 2,
    maxlength: 40
  },
  lastName: {
    type: String,
    minlength: 2,
    maxlength: 40
  },
  get fullName () {
    return this.firstName + ' ' + this.lastName
  },
  email: String, // todo: validate,
  phoneNumber: Number,
  password: String,
  createdAt: Date,
  updatedAt: Date
}
