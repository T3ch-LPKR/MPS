// Helper Supabase Storage via REST (tanpa dependency). Server-only (pakai service role key).
// Env: SUPABASE_URL (https://<ref>.supabase.co) + SUPABASE_SERVICE_ROLE_KEY.
const URL_BASE = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET || "sjp-photos";

function headers(extra?: Record<string, string>) {
  return { Authorization: `Bearer ${KEY}`, apikey: KEY, ...(extra || {}) };
}

export function storageReady(): boolean {
  return !!URL_BASE && !!KEY;
}

/** Upload/replace foto (JPEG). Return path bila sukses, null bila gagal. */
export async function uploadPhoto(path: string, buf: Buffer): Promise<string | null> {
  if (!storageReady()) return null;
  try {
    const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "3600" }),
      body: buf as any,
    });
    return res.ok ? path : null;
  } catch { return null; }
}

/** Signed URL 1 file (default 1 jam). */
export async function signedUrl(path: string | null, expiresIn = 3600): Promise<string | null> {
  if (!path || !storageReady()) return null;
  try {
    const res = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.signedURL ? `${URL_BASE}/storage/v1${j.signedURL}` : null;
  } catch { return null; }
}

/** Signed URL banyak file sekaligus (batch untuk grid). Return map path->url. */
export async function signedUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const list = (paths || []).filter(Boolean);
  if (!list.length || !storageReady()) return out;
  try {
    const res = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn, paths: list }),
    });
    if (!res.ok) return out;
    const arr = await res.json();
    for (const it of arr || []) {
      if (it?.path && it?.signedURL) out[it.path] = `${URL_BASE}/storage/v1${it.signedURL}`;
    }
    return out;
  } catch { return out; }
}

/** Hapus banyak objek (untuk purge >30 hari). Return jumlah yang terhapus. */
export async function removePhotos(paths: string[]): Promise<number> {
  const list = (paths || []).filter(Boolean);
  if (!list.length || !storageReady()) return 0;
  try {
    const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: list }),
    });
    if (!res.ok) return 0;
    const arr = await res.json();
    return Array.isArray(arr) ? arr.length : list.length;
  } catch { return 0; }
}
