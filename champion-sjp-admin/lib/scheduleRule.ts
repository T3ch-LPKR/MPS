// Aturan penjadwalan bersama — dipakai generateSchedule (actions) & preview kalender.
// dow index bisnis: 0=Senin .. 5=Sabtu (Minggu libur).

export type AssignRule = { frekuensi: string; hari_mask: number; minggu_ke: number | null };

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
  if (!(a.hari_mask & (1 << dow))) return false;
  const wom = weekOfMonth(d);
  if (a.frekuensi === "W" || a.frekuensi === "C") return true;
  if (a.frekuensi === "BW") return a.minggu_ke === 2 ? wom % 2 === 0 : wom % 2 === 1;
  if (a.frekuensi === "M") return a.minggu_ke ? wom === a.minggu_ke : wom === 1;
  return false;
}
