"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/master", label: "Master & Assign", icon: "☰" },
  { href: "/schedule", label: "Generate & Kalender", icon: "▤" },
  { href: "/lov", label: "LOV Catatan", icon: "✎" },
  { href: "/prospek", label: "Prospek", icon: "◎" },
  { href: "/users", label: "Kelola User", icon: "⚙" },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="p-2.5 flex-1 overflow-auto">
      {NAV.map((n) => {
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
    </nav>
  );
}
