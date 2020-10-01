const R = require('ramda')

const getSkip = R.path(['lock', 'skip'])

const skipLog = R.cond([
  [R.compose(R.isNil, getSkip), R.T],
  [R.T, getSkip]
])

console.log(skipLog({
  lock: {
    skip: false
  }
}))

console.log(skipLog({
  lock: {
  }
}))

console.log(skipLog({
}))
