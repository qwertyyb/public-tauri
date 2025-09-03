export const getItem = <T = any>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) as any);
  } catch (err) {
    console.error('Failed to get item:', key, err);
    return null;
  }
};

export const setItem = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};
