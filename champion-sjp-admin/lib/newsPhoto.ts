// Foto berita diserve same-origin lewat /api/news-photo (route dual-read: Storage atau bytea).
type Row = { news_id: number; photo_path?: string | null; has_bytea?: boolean };

export async function withNewsPhotoUrl<T extends Row>(rows: T[]): Promise<(T & { photo_url: string | null })[]> {
  return rows.map((r) => ({
    ...r,
    photo_url: (r.photo_path || r.has_bytea) ? `/api/news-photo/${r.news_id}` : null,
  }));
}
