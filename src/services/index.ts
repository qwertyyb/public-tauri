import { handleQuery, handleSelect, handleEnter, handleAction } from "@/plugin/service"

export const query = (keyword: string) => {
  return handleQuery(keyword) || []
}

export const select = (result: IResultItem, keyword: string) => {
  // @ts-ignore
  return handleSelect(result, keyword)
}

export const enter = (result: IResultItem, keyword: string) => {
  // @ts-ignore
  return handleEnter(result)
}

export const action = (result: IResultItem, action: IActionItem, keyword: string) => {
  // @ts-ignore
  return handleAction(result, action, keyword)
}