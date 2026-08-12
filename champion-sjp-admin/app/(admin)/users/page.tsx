import Link from "next/link";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import { toggleUser } from "./actions";
import AddUserForm from "./AddUserForm";
import ResetPwForm from "./ResetPwForm";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: any = { superadmin: "Super Admin", admin: "Admin", hos: "Head of Sales", salesman: "Salesman" };
const ROLE_PILL: any = { superadmin: "p-bad", admin: "p-info", hos: "p-warn", salesman: "p-mut" };

export default async function UsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const me = await getSession();
  const isSuper = me?.role === "superadmin";
  const canManage = me?.role === "admin" || isSuper;

  if (!canManage) {
    return (
      <div className="card p-6 text-sm text-mut">
        Anda tidak berwenang mengakses <b>Kelola User</b>. Hubungi Administrator.
      </div>
    );
  }

  const search = (searchParams.q || "").trim();
  const users = await q<any>(`
    SELECT user_id, username, full_name, role, emp_id, is_active, last_login
      FROM sjp_user_login
     WHERE ($1='' OR username ILIKE '%'||$1||'%' OR full_name ILIKE '%'||$1||'%'
            OR emp_id ILIKE '%'||$1||'%' OR role ILIKE '%'||$1||'%')
     ORDER BY CASE role WHEN 'superadmin' THEN 0 WHEN 'admin' THEN 1 WHEN 'hos' THEN 2 ELSE 3 END, username`,
    [search]);
  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);

  return (
    <>
      <div className="mb-1 text-xl font-bold">Kelola User Login</div>
      <div className="text-sm text-mut mb-5">
        Akun akses SJP. Login sebagai <b>{ROLE_LABEL[me!.role]}</b>.
        {!isSuper ? " Akun Super Admin terkunci — tidak bisa Anda ubah." : ""}
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="card p-5 overflow-x-auto">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="font-bold">Daftar User</div>
            <form className="flex gap-2 items-center">
              <input name="q" defaultValue={search} placeholder="Cari username / nama / role…" className="inp !w-56 !py-1.5 text-sm" />
              <button className="btn btn-sm">Cari</button>
              {search ? <Link href="/users" className="btn btn-sm">Reset</Link> : null}
            </form>
          </div>
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Username</th><th className="th">Nama</th><th className="th">Role</th><th className="th">Status</th><th className="th">Reset Password</th><th className="th"></th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="td text-mut text-sm text-center py-4">Tidak ada user cocok "{search}".</td></tr>
              ) : null}
              {users.map((u) => {
                const locked = u.role === "superadmin" && !isSuper; // admin tak boleh utak-atik superadmin
                return (
                  <tr key={u.user_id} className="hover:bg-[#fafafa]">
                    <td className="td font-semibold">{u.username}{locked ? " 🔒" : ""}</td>
                    <td className="td">{u.full_name || "—"}</td>
                    <td className="td">
                      <span className={`pill ${ROLE_PILL[u.role] || "p-mut"}`}>{ROLE_LABEL[u.role] || u.role}</span>
                      {u.emp_id ? <span className="text-[11px] text-mut ml-1">{u.emp_id}</span> : null}
                    </td>
                    <td className="td"><span className={`pill ${u.is_active ? "p-ok" : "p-mut"}`}>{u.is_active ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="td">
                      {locked ? (
                        <span className="text-[11px] text-mut">Terkunci</span>
                      ) : (
                        <ResetPwForm userId={u.user_id} />
                      )}
                    </td>
                    <td className="td">
                      {locked ? (
                        <span className="text-[11px] text-mut">—</span>
                      ) : (
                        <form action={toggleUser}><input type="hidden" name="user_id" value={u.user_id} />
                          <SubmitButton className="btn btn-sm" pendingText="…">{u.is_active ? "Nonaktifkan" : "Aktifkan"}</SubmitButton></form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card p-5 self-start">
          <div className="font-bold mb-3">Tambah User</div>
          <AddUserForm salesmen={salesmen} isSuper={isSuper} />
        </div>
      </div>
    </>
  );
}
