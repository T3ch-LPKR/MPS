import { q1 } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const r = await q1<{ svalue: string }>(`SELECT svalue FROM sjp_setting WHERE skey=$1`, [key]);
  return r?.svalue ?? null;
}

export async function getBoolSetting(key: string, def = false): Promise<boolean> {
  const v = await getSetting(key);
  if (v == null) return def;
  return v === "true" || v === "1";
}
