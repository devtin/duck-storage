const cleanId = (payload) => {
  return {
    ...payload,
    _id: payload._id.toString()
  }
}

Object.assign(global, { cleanId })
