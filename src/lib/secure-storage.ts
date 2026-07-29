import { base64ToBytes, bytesToBase64, utf8 } from '@/lib/encoding';

const DATABASE = 'beseen-secure-client';
const STORE = 'records';
const DEVICE_KEY = 'device-wrapping-key';

type EncryptedRecord = { iv: string; ciphertext: string };

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('Secure browser storage is unavailable.');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
  });
}

async function getRaw<T>(id: string): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await requestResult<T | undefined>(db.transaction(STORE).objectStore(STORE).get(id));
  } finally {
    db.close();
  }
}

async function putRaw(id: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  try {
    await requestResult(db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, id));
  } finally {
    db.close();
  }
}

async function wrappingKey(): Promise<CryptoKey> {
  const existing = await getRaw<CryptoKey>(DEVICE_KEY);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  await putRaw(DEVICE_KEY, key);
  return key;
}

export async function setSecureJson(id: string, value: unknown): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await wrappingKey(),
    Uint8Array.from(utf8(JSON.stringify(value))),
  );
  await putRaw(id, {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  } satisfies EncryptedRecord);
}

export async function getSecureJson<T>(id: string): Promise<T | null> {
  try {
    const record = await getRaw<EncryptedRecord>(id);
    if (!record) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(base64ToBytes(record.iv, 12)) },
      await wrappingKey(),
      Uint8Array.from(base64ToBytes(record.ciphertext)),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}

export async function deleteSecureRecord(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      await requestResult(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
    } finally {
      db.close();
    }
  } catch {
    // Storage can be blocked; in-memory state is still cleared by callers.
  }
}
