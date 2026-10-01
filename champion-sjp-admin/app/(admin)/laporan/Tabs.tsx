import Link from "next/link";

// Tab navigasi bersama halaman Laporan (dulu terduplikasi di produktivitas & issue).
const TABS = [
  { href: "/laporan/dashboard", label: "Dashboard SJP" },
  { href: "/laporan/order", label: "Orderan" },
  // Produktivitas & Issue Lapangan disembunyikan dulu (halaman tetap hidup via URL):
  // { href: "/laporan/produktivitas", label: "Produktivitas" },
  // { href: "/laporan/issue", label: "Issue Lapangan" },
];

export default function Tabs({ active }: { active: string }) {
  return (
    <div className="flex gap-2 mb-3 text-sm flex-wrap">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`btn btn-sm ${t.href === active ? "btn-pri" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
