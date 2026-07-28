"use client";

const DB_NAME = "beseen-secure-v1";
const DB_VERSION = 1;
const META_STORE = "meta";
const RECORD_STORE = "records";
const DEVICE_KEY_ID = "device-wrapping-key";
const OPEN_TIMEOUT_MS = 5_000;

type SecureRecord = {
  id: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  version: 1;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;
    const timer = window.setTimeout(() => {
      settled = true;
      reject(new Error("Secure storage did not respond in time."));
    }, OPEN_TIMEOUT_MS);
    const finish = <T,>(callback: (value: T) => void, value: T) => {
      if (settled) {
        if (value instanceof IDBDatabase) value.close();
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      callback(value);
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE);
      }
      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        database.createObjectStore(RECORD_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => finish(resolve, request.result);
    request.onerror = () =>
      finish(
        reject,
        request.error ?? new Error("Secure storage could not be opened."),
      );
    request.onblocked = () =>
      finish(
        reject,
        new Error("Secure storage is blocked by another BeSeen tab."),
      );
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Secure storage request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Secure storage write failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Secure storage write was aborted."));
  });
}

async function getWrappingKey(database: IDBDatabase): Promise<CryptoKey> {
  const readTransaction = database.transaction(META_STORE, "readonly");
  const existing = await requestResult<CryptoKey | undefined>(
    readTransaction.objectStore(META_STORE).get(DEVICE_KEY_ID),
  );
  if (existing) return existing;

  const generated = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const writeTransaction = database.transaction(META_STORE, "readwrite");
  writeTransaction.objectStore(META_STORE).put(generated, DEVICE_KEY_ID);
  await transactionDone(writeTransaction);
  return generated;
}

export async function putSecureJson<T>(id: string, value: T): Promise<void> {
  const database = await openDatabase();
  try {
    const wrappingKey = await getWrappingKey(database);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      wrappingKey,
      plaintext,
    );
    plaintext.fill(0);

    const transaction = database.transaction(RECORD_STORE, "readwrite");
    transaction.objectStore(RECORD_STORE).put({
      id,
      iv,
      ciphertext,
      version: 1,
    } satisfies SecureRecord);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function getSecureJson<T>(id: string): Promise<T | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(RECORD_STORE, "readonly");
    const record = await requestResult<SecureRecord | undefined>(
      transaction.objectStore(RECORD_STORE).get(id),
    );
    if (!record) return null;
    const wrappingKey = await getWrappingKey(database);
    const iv = new Uint8Array(Array.from(record.iv));
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      wrappingKey,
      record.ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch (cause) {
    throw new Error("Secure local data could not be decrypted.", {
      cause,
    });
  } finally {
    database.close();
  }
}

export async function deleteSecureRecord(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(RECORD_STORE, "readwrite");
    transaction.objectStore(RECORD_STORE).delete(id);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function hasSecureRecord(id: string): Promise<boolean> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(RECORD_STORE, "readonly");
    const key = await requestResult<IDBValidKey | undefined>(
      transaction.objectStore(RECORD_STORE).getKey(id),
    );
    return key !== undefined;
  } finally {
    database.close();
  }
}
