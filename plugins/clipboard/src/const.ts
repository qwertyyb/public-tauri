export enum ContentType {
  text = 0,
  image = 1
}

export const DATABASE_PATH = 'sqlite:clipboard.db';

export const getHash = async (data: string | BufferSource): Promise<string> => {
  const encoder = new TextEncoder();
  const buffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
