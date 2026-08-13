// Antrean absen offline di HP (IndexedDB). Client-only. Tanpa dependency.
// Foto ~80 KB -> IndexedDB (bukan localStorage yang mudah penuh).

export type AbsenItem = {
  id: string;
  mode: "MASUK" | "PULANG";
  lat: number;
  lng: number;
  accuracy: number | null;
  photo: string;      // base64 dataURL
  client_ts: string;  // ISO waktu absen sebenarnya
  created_at: number;
};

const DB = "sjp_offline";
const STORE = "absen_queue";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-idb"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function enqueue(item: Omit<AbsenItem, "id" | "created_at">): Promise<void> {
  const db = await open();
  const rec: AbsenItem = { ...item, id: `${Date.now()}-${Math.round(performance.now())}`, created_at: Date.now() };
  await new Promise<void>((res, rej) => { const r = tx(db, "readwrite").add(rec); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
  db.close();
}

export async function allItems(): Promise<AbsenItem[]> {
  try {
    const db = await open();
    const items = await new Promise<AbsenItem[]>((res, rej) => { const r = tx(db, "readonly").getAll(); r.onsuccess = () => res(r.result as AbsenItem[]); r.onerror = () => rej(r.error); });
    db.close();
    return items.sort((a, b) => a.created_at - b.created_at);
  } catch { return []; }
}

export async function removeItem(id: string): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => { const r = tx(db, "readwrite").delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
  db.close();
}

export async function countItems(): Promise<number> {
  try {
    const db = await open();
    const n = await new Promise<number>((res, rej) => { const r = tx(db, "readonly").count(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    db.close();
    return n;
  } catch { return 0; }
}
