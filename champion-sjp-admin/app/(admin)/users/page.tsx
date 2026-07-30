import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import { addUser, resetPassword, toggleUser } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: any = { superadmin: "Super Admin", admin: "Admin", hos: "Head of Sales", salesman: "Salesman" };
const ROLE_PILL: any = { superadmin: "p-bad", admin: "p-info", hos: "p-warn", salesman: "p-mut" };

export default async function UsersPage() {
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

  const users = await q<any>(`SELECT user_id, username, full_name, role, emp_id, is_active, last_login FROM sjp_user_login ORDER BY
    CASE role WHEN 'superadmin' THEN 0 WHEN 'admin' THEN 1 WHEN 'hos' THEN 2 ELSE 3 END, username`);
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
          <div className="font-bold mb-3">Daftar User</div>
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Username</th><th className="th">Nama</th><th className="th">Role</th><th className="th">Status</th><th className="th">Reset Password</th><th className="th"></th></tr></thead>
            <tbody>
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
                        <form action={resetPassword} className="flex gap-1 items-center">
                          <input type="hidden" name="user_id" value={u.user_id} />
                          <input name="password" type="password" className="inp !w-28 !py-1" placeholder="baru" />
                          <button className="btn btn-sm">Set</button>
                        </form>
                      )}
                    </td>
                    <td className="td">
                      {locked ? (
                        <span className="text-[11px] text-mut">—</span>
                      ) : (
                        <form action={toggleUser}><input type="hidden" name="user_id" value={u.user_id} />
                          <button className="btn btn-sm">{u.is_active ? "Nonaktifkan" : "Aktifkan"}</button></form>
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
          <form action={addUser} className="space-y-3">
            <div><label className="lbl">Username</label><input name="username" className="inp" required /></div>
            <div><label className="lbl">Password</label><input name="password" type="password" className="inp" required /></div>
            <div><label className="lbl">Nama lengkap</label><input name="full_name" className="inp" /></div>
            <div><label className="lbl">Role</label>
              <select name="role" className="inp">
                <option value="admin">Admin</option>
                <option value="hos">Head of Sales</option>
                <option value="salesman">Salesman</option>
                {isSuper ? <option value="superadmin">Super Admin</option> : null}
              </select></div>
            <div><label className="lbl">Link Salesman (untuk role Salesman)</label>
              <select name="emp_id" className="inp"><option value="">—</option>
                {salesmen.map((s) => <option key={s.emp_id} value={s.emp_id}>{s.emp_name} ({s.emp_id})</option>)}</select></div>
            <button className="btn btn-pri w-full justify-center">＋ Tambah User</button>
            {!isSuper ? <p className="text-[11px] text-mut">Hanya Super Admin yang bisa membuat/mengubah akun Super Admin.</p> : null}
          </form>
        </div>
      </div>
    </>
  );
}
