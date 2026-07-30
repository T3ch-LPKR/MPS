"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function loginAction(_prev: any, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) return { error: "Isi username & password" };
  const res = await login(username, password);
  if (!res.ok) return { error: res.msg || "Login gagal" };

  const s = await getSession();
  const dest = s?.role === "salesman" ? "/sales" : s?.role === "hos" ? "/hos" : "/";
  redirect(dest);
}
