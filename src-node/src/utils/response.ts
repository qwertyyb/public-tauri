export const createResponse = (data: any = null, errCode = 0, errMsg = 'ok') => {
  return { data, errCode, errMsg }
}