export enum ContentType {
  text = 0,
  image = 1
}

export const DATABASE_PATH = 'sqlite:clipboard.db';

// 敏感内容匹配模式
export const SENSITIVE_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /sk-[A-Za-z0-9]{32,}/,  // OpenAI API Key
  /ghp_[A-Za-z0-9]{36}/,  // GitHub Personal Access Token
  /\d{16,}/,  // 长数字序列 (银行卡等)
];

export const isSensitiveContent = (text: string): boolean => SENSITIVE_PATTERNS.some(pattern => pattern.test(text));

export const getHash = async (data: string | BufferSource): Promise<string> => {
  const encoder = new TextEncoder();
  const buffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
