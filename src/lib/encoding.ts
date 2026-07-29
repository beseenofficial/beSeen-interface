const utf8Encoder = new TextEncoder();

export const utf8 = (value: string): Uint8Array => utf8Encoder.encode(value);

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string, expectedLength?: number): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Invalid canonical base64 value.');
  }
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (bytesToBase64(bytes) !== value) throw new Error('Base64 value is not canonical.');
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes.`);
  }
  return bytes;
}

export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

