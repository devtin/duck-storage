import pkgUp from 'pkg-up'

export const getAppName = async () => {
  const nearestPackageJson = await pkgUp()
  const packageName = nearestPackageJson ? require(nearestPackageJson).name : 'unknown'
  return `duck-storage_${packageName}.`
}
