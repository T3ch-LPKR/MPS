import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "../(admin)/actions";
import RefreshButton from "./RefreshButton";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  // salesman utama; admin/superadmin boleh preview
  if (!["salesman", "admin", "superadmin"].includes(user.role)) redirect("/");

  return (
    <div className="min-h-screen bg-[#c9ccd2] flex justify-center">
      <div className="w-full max-w-[460px] bg-[#eef0f3] min-h-screen flex flex-col relative">
        {/* app bar */}
        <div className="bg-brand text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow">
          <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/champion.png" alt="" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm leading-tight">{user.full_name || user.username}</div>
            <div className="text-[11px] opacity-90">
              {user.emp_id ? `Salesman · ${user.emp_id}` : "Sales App"}
            </div>
          </div>
          <RefreshButton />
          <Link href="/sales/akun" className="text-[11px] bg-white/20 rounded-full px-3 py-1">Akun</Link>
          <form action={logoutAction}>
            <button className="text-[11px] bg-white/20 rounded-full px-3 py-1">Keluar</button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto pb-16">{children}</div>

        {/* bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] bg-white border-t border-line flex">
          <Link href="/sales" className="flex-1 text-center py-2 text-[11px] font-semibold text-brand">
            <div className="text-lg leading-none">🗓️</div>Plan
          </Link>
          <Link href="/sales/riwayat" className="flex-1 text-center py-2 text-[11px] font-semibold text-mut">
            <div className="text-lg leading-none">🕘</div>Riwayat
          </Link>
          <Link href="/sales/berita" className="flex-1 py-2 text-[11px] font-semibold text-mut flex flex-col items-center">
            <span className="text-lg leading-none">📣</span>
            <span>Berita</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
