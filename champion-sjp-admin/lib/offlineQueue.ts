// Antrean offline generik di HP (IndexedDB). Client-only, tanpa dependency.
// Dua store: "absen" (absensi) & "visit" (check-in kunjungan). Foto ~80 KB -> IndexedDB.

export type QStore = "absen" | "visit";
export type QItem = { id: string; created_at: number; [k: string]: any };

const DB = "sjp_offline";
const VERSION = 2;
const OBJ: Record<QStore, string> = { absen: "absen_queue", visit: "visit_queue" };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-idb"));
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of Object.values(OBJ)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function os(db: IDBDatabase, store: QStore, mode: IDBTransactionMode) {
  return db.transaction(OBJ[store], mode).objectStore(OBJ[store]);
}

export async function enqueue(store: QStore, payload: Record<string, any>): Promise<void> {
  const db = await open();
  const rec: QItem = { ...payload, id: `${Date.now()}-${Math.round(performance.now())}-${Math.floor(Math.random() * 1e6)}`, created_at: Date.now() };
  await new Promise<void>((res, rej) => { const r = os(db, store, "readwrite").add(rec); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
  db.close();
}

export async function allItems(store: QStore): Promise<QItem[]> {
  try {
    const db = await open();
    const items = await new Promise<QItem[]>((res, rej) => { const r = os(db, store, "readonly").getAll(); r.onsuccess = () => res(r.result as QItem[]); r.onerror = () => rej(r.error); });
    db.close();
    return items.sort((a, b) => a.created_at - b.created_at);
  } catch { return []; }
}

export async function removeItem(store: QStore, id: string): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => { const r = os(db, store, "readwrite").delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
  db.close();
}

export async function countItems(store: QStore): Promise<number> {
  try {
    const db = await open();
    const n = await new Promise<number>((res, rej) => { const r = os(db, store, "readonly").count(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    db.close();
    return n;
  } catch { return 0; }
}
