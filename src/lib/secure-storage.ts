import { base64ToBytes, bytesToBase64, utf8 } from '@/lib/encoding';

const DATABASE = 'beseen-secure-client';
const STORE = 'records';
const DEVICE_KEY = 'device-wrapping-key';

type EncryptedRecord = { iv: string; ciphertext: string };
type AccountBoundEnvelope<T> = { accountBinding: string; value: T };
type AccountRecordResult<T> =
  | { belongsToAccount: false }
  | { belongsToAccount: true; value: T };

const MAX_ACCOUNT_RECORDS = 50;

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

function isEncryptedRecord(value: unknown): value is EncryptedRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.iv === 'string' && typeof record.ciphertext === 'string';
}

function accountBinding(collectionId: string, account: string): Uint8Array {
  return Uint8Array.from(
    utf8(
      [
        'beseen/account-bound-storage/v1',
        collectionId,
        account.toUpperCase(),
      ].join('\n'),
    ),
  );
}

function accountBindingToken(collectionId: string, account: string): string {
  return bytesToBase64(accountBinding(collectionId, account));
}

function ownedArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

async function encryptJson(value: unknown): Promise<EncryptedRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ownedArrayBuffer(iv),
    },
    await wrappingKey(),
    ownedArrayBuffer(Uint8Array.from(utf8(JSON.stringify(value)))),
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptJson<T>(record: EncryptedRecord): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ownedArrayBuffer(
        Uint8Array.from(base64ToBytes(record.iv, 12)),
      ),
    },
    await wrappingKey(),
    ownedArrayBuffer(Uint8Array.from(base64ToBytes(record.ciphertext))),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

async function decryptLegacyAccountRecord<T>(
  record: EncryptedRecord,
  binding: Uint8Array,
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ownedArrayBuffer(
        Uint8Array.from(base64ToBytes(record.iv, 12)),
      ),
      additionalData: ownedArrayBuffer(binding),
    },
    await wrappingKey(),
    ownedArrayBuffer(Uint8Array.from(base64ToBytes(record.ciphertext))),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

function isAccountBoundEnvelope(
  value: unknown,
): value is AccountBoundEnvelope<unknown> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Record<string, unknown>;
  return (
    typeof envelope.accountBinding === 'string' &&
    Object.prototype.hasOwnProperty.call(envelope, 'value')
  );
}

async function readAccountRecord<T>(
  record: EncryptedRecord,
  binding: Uint8Array,
  bindingToken: string,
): Promise<AccountRecordResult<T>> {
  try {
    const envelope = await decryptJson<unknown>(record);
    if (
      isAccountBoundEnvelope(envelope) &&
      envelope.accountBinding === bindingToken
    ) {
      return { belongsToAccount: true, value: envelope.value as T };
    }
    return { belongsToAccount: false };
  } catch {
    try {
      return {
        belongsToAccount: true,
        value: await decryptLegacyAccountRecord<T>(record, binding),
      };
    } catch {
      return { belongsToAccount: false };
    }
  }
}

export async function setSecureJson(id: string, value: unknown): Promise<void> {
  await putRaw(id, await encryptJson(value));
}

export async function getSecureJson<T>(id: string): Promise<T | null> {
  try {
    const record = await getRaw<EncryptedRecord>(id);
    if (!isEncryptedRecord(record)) return null;
    return await decryptJson<T>(record);
  } catch {
    return null;
  }
}

/**
 * Stores one encrypted value per account in an opaque IndexedDB array. The
 * account binding is stored inside the authenticated ciphertext and checked
 * after decryption. Secrecy comes from the browser's non-extractable device
 * key; a public Stellar address is not an encryption secret by itself.
 */
export async function setAccountBoundJson(
  collectionId: string,
  account: string,
  value: unknown,
): Promise<void> {
  const binding = accountBinding(collectionId, account);
  const bindingToken = accountBindingToken(collectionId, account);
  const raw = await getRaw<unknown>(collectionId);
  const records = Array.isArray(raw) ? raw.filter(isEncryptedRecord) : [];
  const retained: EncryptedRecord[] = [];

  for (const record of records) {
    const opened = await readAccountRecord(
      record,
      binding,
      bindingToken,
    );
    if (!opened.belongsToAccount) retained.push(record);
  }

  retained.push(
    await encryptJson({
      accountBinding: bindingToken,
      value,
    } satisfies AccountBoundEnvelope<unknown>),
  );
  await putRaw(collectionId, retained.slice(-MAX_ACCOUNT_RECORDS));
}

export async function getAccountBoundJson<T>(
  collectionId: string,
  account: string,
): Promise<T | null> {
  try {
    const binding = accountBinding(collectionId, account);
    const bindingToken = accountBindingToken(collectionId, account);
    const raw = await getRaw<unknown>(collectionId);
    const records = Array.isArray(raw) ? raw.filter(isEncryptedRecord) : [];
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const opened = await readAccountRecord<T>(
        records[index],
        binding,
        bindingToken,
      );
      if (opened.belongsToAccount) return opened.value;
    }
  } catch {
    // Storage can be blocked or unavailable.
  }
  return null;
}

export async function deleteAccountBoundRecord(
  collectionId: string,
  account: string,
): Promise<void> {
  try {
    const binding = accountBinding(collectionId, account);
    const bindingToken = accountBindingToken(collectionId, account);
    const raw = await getRaw<unknown>(collectionId);
    const records = Array.isArray(raw) ? raw.filter(isEncryptedRecord) : [];
    const retained: EncryptedRecord[] = [];
    for (const record of records) {
      const opened = await readAccountRecord(
        record,
        binding,
        bindingToken,
      );
      if (!opened.belongsToAccount) retained.push(record);
    }
    await putRaw(collectionId, retained);
  } catch {
    // Storage can be blocked; in-memory state is still cleared by callers.
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

export async function deleteSecureRecordsWithPrefix(
  prefix: string,
): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        const request = transaction.objectStore(STORE).openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (
            typeof cursor.primaryKey === 'string' &&
            cursor.primaryKey.startsWith(prefix)
          ) {
            cursor.delete();
          }
          cursor.continue();
        };
        request.onerror = () =>
          reject(request.error ?? new Error('IndexedDB cursor failed.'));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(
            transaction.error ?? new Error('IndexedDB transaction failed.'),
          );
        transaction.onabort = () =>
          reject(
            transaction.error ?? new Error('IndexedDB transaction aborted.'),
          );
      });
    } finally {
      db.close();
    }
  } catch {
    // Storage can be blocked; callers still avoid creating new legacy records.
  }
}
