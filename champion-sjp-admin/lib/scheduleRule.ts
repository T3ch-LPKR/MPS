// Aturan penjadwalan bersama — dipakai generateSchedule (actions) & preview kalender.
// dow index bisnis: 0=Senin .. 5=Sabtu (Minggu libur).

export type AssignRule = {
  frekuensi: string; hari_mask: number; minggu_ke: number | null;
  custom_dates?: string[] | null; // frekuensi C: tanggal spesifik YYYY-MM-DD (maks 4, tanpa pola)
};

// YYYY-MM-DD lokal (tanpa pergeseran UTC)
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Normalisasi custom_dates dari DB (pg date[] bisa berupa Date object atau string) -> ['YYYY-MM-DD']
export function normDates(arr: any[] | null | undefined): string[] {
  return (arr || []).map((x: any) => (typeof x === "string" ? x.slice(0, 10) : ymd(new Date(x))));
}

// minggu ke-berapa tanggal ini dalam bulannya (1..5)
export function weekOfMonth(d: Date): number {
  return Math.ceil(d.getDate() / 7);
}

// index hari kerja Senin=0..Sabtu=5, Minggu=6
export function bizDow(d: Date): number {
  return (d.getDay() + 6) % 7;
}

// apakah assignment ini terjadwal pada tanggal d?
export function scheduledOn(a: AssignRule, d: Date): boolean {
  const dow = bizDow(d);
  if (dow > 5) return false; // Minggu libur
  // Custom = tanggal kalender spesifik, tanpa pola — hari_mask/minggu_ke diabaikan
  if (a.frekuensi === "C") return (a.custom_dates || []).includes(ymd(d));
  if (!(a.hari_mask & (1 << dow))) return false;
  const wom = weekOfMonth(d);
  if (a.frekuensi === "W") return true;
  if (a.frekuensi === "BW") return a.minggu_ke === 2 ? wom % 2 === 0 : wom % 2 === 1;
  if (a.frekuensi === "M") return a.minggu_ke ? wom === a.minggu_ke : wom === 1;
  return false;
}
