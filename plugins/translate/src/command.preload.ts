import { type IListViewCommand } from '@public/types'

const listView: IListViewCommand = {
  search: async (keyword: string, setList: (list: any[]) => void) => {
    console.log('search', keyword)
    if (!keyword) return setList([])
    const results = (await Promise.all([
      translate(keyword).catch(err => {
        console.error(err)
        return [] as any[]
      })
    ])).flat()
    setList(results)
  }
}

export default listView