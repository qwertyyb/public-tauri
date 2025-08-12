import { type IListViewCommand } from '@public/api'

const invokeServer = async (name: string, method: string, args: any[]) => {
  const r = await fetch('http://127.0.0.1:2345/api/manager/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, method, args})
  })
  const { data } = await r.json()
  return data
}

const listView: IListViewCommand = {
  search: async (keyword: string, setList: (list: any[]) => void) => {
    console.log('search', keyword)
    if (!keyword) return setList([])
    const results = (await Promise.all([
      invokeServer('translate', 'translate', [keyword])
    ])).flat()
    setList(results)
  }
}

export default listView