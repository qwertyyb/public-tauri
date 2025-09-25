import type { ICommand } from "@public/api";

// 编码 Unicode 字符串到 Base64
function encodeUnicodeToBase64(str: string) {
  // 1. 将字符串转换为UTF-8字节数组（Uint8Array）
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  
  // 2. 将字节数组转换为二进制字符串（模拟btoa所需的格式）
  // 这里用一个巧妙的方法：将每个字节当作字符码，组成一个字符串
  let binaryString = '';
  bytes.forEach(byte => binaryString += String.fromCharCode(byte));
  
  // 3. 用btoa对二进制字符串进行Base64编码
  return window.btoa(binaryString);
}

// 解码 Base64 到 Unicode 字符串
function decodeBase64ToUnicode(base64Str: string) {
  // 1. 用atob将Base64解码为“二进制字符串”
  const binaryString = window.atob(base64Str);
  
  // 2. 将“二进制字符串”转换为字节数组（Uint8Array）
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // 3. 用TextDecoder将UTF-8字节数组解码为Unicode字符串
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

// 使用示例
// const originalText = '你好，世界！ Hello! 🎉';
// const base64 = encodeUnicodeToBase64(originalText);
// console.log(base64); // “5L2g5aW9LCDkuJbnlYwhIEhlbGxvIPCfkKk=”
// const decodedText = decodeBase64ToUnicode(base64);
// console.log(decodedText); // “你好，世界！ Hello! 🎉”

export const encode = (text: string): ICommand[] => {
  const result = encodeUnicodeToBase64(text)
  return [
    {
      icon: '',
      name: 'currency',
      title: result,
      value: result,
      subtitle: 'Base64编码',
    },
  ]
}

export const decode = (text: string) => {
  const result = decodeBase64ToUnicode(text)
  return [
    {
      icon: '',
      name: 'currency',
      title: result,
      value: result,
      subtitle: 'Base64解码',
    },
  ]
}