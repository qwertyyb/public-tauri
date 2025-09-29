export const invokePluginServerMethod = async (name: string, method: string, args: any[]) => {
  const r = await fetch('http://127.0.0.1:2345/api/manager/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, method, args }),
  });
  const { data } = await r.json();
  return data;
};

export const invokeServerUtils = async (method: string, args: any[] = [], options = { raw: false }) => {
  const r = await fetch('http://127.0.0.1:2345/utils/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method, args }),
  });
  if (options.raw) {
    return r;
  }
  const { data, errCode, errMsg } = await r.json();
  if (errCode === 0) {
    return data;
  }
  throw new Error(errMsg);
};
