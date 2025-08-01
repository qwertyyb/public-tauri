export const registerModule = async (modulePath: string) => {
  if (!modulePath) throw new Error('Module path must be specified!')
  return import(modulePath)
}

export const unreginsterModule = (modulePath: string) => {

}