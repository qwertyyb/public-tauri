import { handleQuery, handleSelect, handleEnter, handleAction } from '@/plugin/service';

export const query = (keyword: string) => handleQuery(keyword);

// @ts-ignore
export const select = (result: IResultItem, keyword: string) => handleSelect(result, keyword);

// @ts-ignore
export const enter = (result: IResultItem, keyword: string) => handleEnter(result, keyword);

// @ts-ignore
export const action = (result: IResultItem, action: IActionItem, keyword: string) => handleAction(result, action, keyword);
