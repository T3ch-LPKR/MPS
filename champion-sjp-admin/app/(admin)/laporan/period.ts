// Helper periode laporan: default bulan berjalan (WIB), atau rentang tanggal bila from&to diisi.

export type PeriodSP = { m?: string; from?: string; to?: string; femp?: string };

const isYmd = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isYm = (s?: string) => !!s && /^\d{4}-\d{2}$/.test(s);

// tanggal hari ini versi WIB (YYYY-MM-DD)
export function wibToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function resolvePeriod(sp: PeriodSP): {
  first: string; last: string; label: string; mode: "range" | "month"; m: string;
} {
  // rentang tanggal menang bila keduanya valid
  if (isYmd(sp.from) && isYmd(sp.to)) {
    const [first, last] = sp.from! <= sp.to! ? [sp.from!, sp.to!] : [sp.to!, sp.from!];
    return {
      first, last, mode: "range",
      m: first.slice(0, 7),
      label: `${new Date(first).toLocaleDateString("id")} s/d ${new Date(last).toLocaleDateString("id")}`,
    };
  }
  // default: bulan (dari ?m= atau bulan WIB berjalan)
  const m = isYm(sp.m) ? sp.m! : wibToday().slice(0, 7);
  const [yy, mm] = m.split("-").map(Number);
  const first = `${m}-01`;
  const last = `${m}-${String(new Date(yy, mm, 0).getDate()).padStart(2, "0")}`;
  return { first, last, mode: "month", m, label: `${BULAN[mm - 1]} ${yy}` };
}
