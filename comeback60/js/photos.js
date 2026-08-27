// Progress photos live in IndexedDB, never in localStorage (blobs would blow
// its ~5MB quota fast) and never anywhere off-device. No upload path exists
// in this file at all — that is a privacy guarantee enforced by omission,
// not a setting someone could accidentally flip.

const DB_NAME = 'comeback60_photos';
const DB_VERSION = 1;
const STORE = 'photos';

let dbPromise = null;

function openDB(){
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)){
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('dayIndex', 'dayIndex');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function uuid(){
  return (crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

// `type` distinguishes a scheduled body progress photo ('progress') from a
// closet item photo ('closet') in the same store — both are private device
// blobs with identical lifecycle rules, so one store is simpler than two.
export async function addPhoto({ blob, type = 'progress', dayIndex = null, angle = null, dateISO = null }){
  const db = await openDB();
  const record = { id: uuid(), blob, type, dayIndex, angle, dateISO, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve(record.id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPhotosByType(type){
  const all = await listPhotos();
  return all.filter(p => p.type === type);
}

export async function getPhoto(id){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listPhotos(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllPhotos(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let objectUrlCache = new Map();
export async function photoURL(id){
  if (objectUrlCache.has(id)) return objectUrlCache.get(id);
  const rec = await getPhoto(id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  objectUrlCache.set(id, url);
  return url;
}

export function revokeAllURLs(){
  objectUrlCache.forEach(url => URL.revokeObjectURL(url));
  objectUrlCache.clear();
}
