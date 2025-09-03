import { handleQuery, handleSelect, handleEnter, handleAction } from '@/plugin/service';

export const query = (keyword: string) => handleQuery(keyword) || [];

export const select = (result: IResultItem, keyword: string) =>
  // @ts-ignore
  handleSelect(result, keyword);


export const enter = (result: IResultItem, keyword: string) =>
  // @ts-ignore
  handleEnter(result);


export const action = (result: IResultItem, action: IActionItem, keyword: string) =>
  // @ts-ignore
  handleAction(result, action, keyword);
