import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import { logoutAction } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-[#141414] text-gray-200 flex-shrink-0 sticky top-0 h-screen flex flex-col">
        <div className="px-5 py-4 border-b border-[#262626] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand grid place-items-center text-white font-extrabold italic shadow">
            C
          </div>
          <div>
            <div className="font-bold text-sm">Champion SJP</div>
            <div className="text-[11px] text-gray-400">Multi Prima Sejahtera</div>
          </div>
        </div>
        <Sidebar />
        <div className="px-5 py-3 border-t border-[#262626] text-[11px] text-gray-400">
          <div className="mb-2">
            {user.full_name || user.username} · <span className="uppercase">{user.role}</span>
          </div>
          <form action={logoutAction}>
            <button className="text-gray-300 hover:text-white underline">Keluar</button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
