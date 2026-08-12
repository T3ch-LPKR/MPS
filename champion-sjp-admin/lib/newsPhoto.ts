import { signedUrls } from "@/lib/storage";

// Dual-read: foto baru di Storage (photo_path -> signed URL); foto lama masih bytea -> /api/news-photo.
type Row = { news_id: number; photo_path?: string | null; has_bytea?: boolean };

export async function withNewsPhotoUrl<T extends Row>(rows: T[]): Promise<(T & { photo_url: string | null })[]> {
  const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];
  const urls = await signedUrls(paths);
  return rows.map((r) => ({
    ...r,
    photo_url: r.photo_path
      ? (urls[r.photo_path] || null)
      : (r.has_bytea ? `/api/news-photo/${r.news_id}` : null),
  }));
}
