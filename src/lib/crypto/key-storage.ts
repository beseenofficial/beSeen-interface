"use client";

const DB_NAME = "beseen-secure-storage";
const STORE = "messaging-keys";
const VERSION = 1;
const OPEN_TIMEOUT_MS = 5_000;
const keyPresenceCache = new Map<string, boolean>();

export type EncryptedKeyRecord = {
  id: string;
  wrappingKey: CryptoKey;
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  algorithm: "AES-GCM";
  version: 1;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
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
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "id" });
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

export async function storeEncryptedPrivateKey(
  ownerId: string,
  privateKey: Uint8Array,
) {
  const wrappingKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    new Uint8Array(privateKey).buffer,
  );
  const record: EncryptedKeyRecord = {
    id: ownerId,
    wrappingKey,
    ciphertext,
    iv,
    algorithm: "AES-GCM",
    version: 1,
  };
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  keyPresenceCache.set(ownerId, true);
}

export async function hasEncryptedPrivateKey(ownerId: string) {
  const cached = keyPresenceCache.get(ownerId);
  if (cached !== undefined) return cached;
  const database = await openDatabase();
  const record = await new Promise<EncryptedKeyRecord | undefined>(
    (resolve, reject) => {
      const request = database.transaction(STORE, "readonly").objectStore(STORE).get(ownerId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    },
  );
  database.close();
  const present = Boolean(record);
  keyPresenceCache.set(ownerId, present);
  return present;
}
