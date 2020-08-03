/**
 * Logs all events emitted by a duck
 * @param {Object} schema
 * @param {Object} payload
 * @return {Array} an array with all of the events fired
 */
export const schemaDuckMonitor = (schema, payload) => {
  const eventsBeingMonitored = []
  const monitor = []
  const monitoring = (eventName) => {
    return eventsBeingMonitored.indexOf(eventName) >= 0
  }
  const registerEvent = ({ eventName, eventSchema }) => {
    if (monitoring(eventName)) {
      return
    }
    eventsBeingMonitored.push(eventName)
    payload.$on(eventName, (...payload) => monitor.push({ fired: new Date(), eventName, eventSchema, payload }))
  }
  // todo: get list of events and listen to all of them
  if (schema._methods) {
    Object.keys(schema._methods).forEach(methodName => {
      const { events } = schema._methods[methodName]
      if (!events) {
        return
      }
      Object.keys(events).forEach(eventName => registerEvent({ eventName, eventSchema: events[eventName] }))
    })
  }
  return monitor
}
