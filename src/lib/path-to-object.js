export function pathToObj (path, value) {
  return path.split('.').reverse().reduce((value, index) => { return { [index]: value } }, value)
}
