"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { title: string | null; items: { href: string; label: string; icon: string }[] }[] = [
  { title: null, items: [
    { href: "/", label: "Dashboard", icon: "▦" },
  ]},
  { title: "Perencanaan", items: [
    { href: "/master", label: "Master & Assign", icon: "☰" },
    { href: "/schedule", label: "Generate & Kalender", icon: "▤" },
    { href: "/lov", label: "LOV Catatan", icon: "✎" },
  ]},
  { title: "Operasional", items: [
    { href: "/absensi", label: "Absensi", icon: "🕒" },
    { href: "/approval-gps", label: "Approval GPS", icon: "📍" },
    { href: "/prospek", label: "Prospek", icon: "◎" },
  ]},
  { title: "Komunikasi", items: [
    { href: "/berita", label: "Berita", icon: "📰" },
  ]},
  { title: "Administrasi", items: [
    { href: "/users", label: "Kelola User", icon: "⚙" },
    { href: "/pengaturan", label: "Pengaturan", icon: "🛠" },
  ]},
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="p-2.5 flex-1 overflow-auto">
      {GROUPS.map((g, gi) => (
        <div key={gi} className={gi > 0 ? "mt-3" : ""}>
          {g.title ? (
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{g.title}</div>
          ) : null}
          {g.items.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium mb-0.5 ${
                  active ? "bg-brand text-white" : "text-gray-300 hover:bg-[#1f1f1f] hover:text-white"
                }`}
              >
                <span className="w-5 text-center">{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
