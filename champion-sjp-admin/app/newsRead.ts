"use server";

import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// Tandai berita dibaca + INVALIDATE cache layout (badge) & halaman (popup) sales/hos,
// supaya popup tak muncul lagi dan badge unread langsung berkurang.
export async function markNewsRead(newsIds: number[]) {
  const s = await getSession();
  if (!s?.user_id) return;
  const ids = (newsIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (!ids.length) return;
  try {
    await q(
      `INSERT INTO sjp_news_read (news_id, user_id)
       SELECT unnest($1::bigint[]), $2 ON CONFLICT DO NOTHING`,
      [ids, s.user_id]);
  } catch { return; }
  revalidatePath("/sales", "layout");
  revalidatePath("/hos", "layout");
}
