import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { q1 } from "@/lib/db";
import { logoutAction } from "../(admin)/actions";
import RefreshButton from "../sales/RefreshButton";
import SessionKeeper from "@/components/SessionKeeper";

export default async function HosLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "salesman") redirect("/sales");
  if (!["hos", "admin", "superadmin"].includes(user.role)) redirect("/");

  const unread = user.user_id ? Number((await q1<any>(
    `SELECT count(*) n FROM sjp_news n
      WHERE is_active AND CURRENT_DATE BETWEEN start_date AND end_date
        AND 'hos' = ANY(target_roles)
        AND NOT EXISTS (SELECT 1 FROM sjp_news_read r WHERE r.news_id=n.news_id AND r.user_id=$1)`,
    [user.user_id]))?.n || 0) : 0;

  return (
    <div className="min-h-screen bg-[#c9ccd2] flex justify-center">
      <SessionKeeper idleMinutes={60} />
      <div className="w-full max-w-[460px] bg-[#eef0f3] min-h-screen flex flex-col relative">
        <div className="bg-brand text-white px-4 py-3 flex items-center gap-2 sticky top-0 z-10 shadow">
          <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/champion.png" alt="" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight truncate">{user.full_name || user.username}</div>
            <div className="text-[11px] opacity-90">Head of Sales</div>
          </div>
          <RefreshButton />
          <Link href="/hos/akun" className="text-[11px] bg-white/20 rounded-full px-3 py-1">Akun</Link>
          <form action={logoutAction}><button className="text-[11px] bg-white/20 rounded-full px-3 py-1">Keluar</button></form>
        </div>

        <div className="flex-1 overflow-y-auto pb-16">{children}</div>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] bg-white border-t border-line flex">
          <Link href="/hos" className="flex-1 text-center py-2 text-[11px] font-semibold text-brand"><div className="text-lg leading-none">📊</div>Overview</Link>
          <Link href="/hos/peta" className="flex-1 text-center py-2 text-[11px] font-semibold text-mut"><div className="text-lg leading-none">🗺️</div>Peta</Link>
          <Link href="/hos/feed" className="flex-1 text-center py-2 text-[11px] font-semibold text-mut"><div className="text-lg leading-none">📷</div>Feed</Link>
          <Link href="/hos/recap" className="flex-1 text-center py-2 text-[11px] font-semibold text-mut"><div className="text-lg leading-none">📈</div>Recap</Link>
          <Link href="/hos/berita" className={`flex-1 text-center py-2 text-[11px] font-semibold ${unread ? "text-brand" : "text-mut"}`}>
            <div className="relative inline-block">
              <span className={`text-lg leading-none inline-block ${unread ? "news-live" : ""}`}>📰</span>
              {unread ? (
                <>
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-brand/50 animate-ping" />
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-brand text-white text-[9px] font-bold leading-4 rounded-full text-center">{unread}</span>
                </>
              ) : null}
            </div>
            Berita
          </Link>
        </nav>
      </div>
    </div>
  );
}
