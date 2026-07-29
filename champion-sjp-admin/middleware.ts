import { NextRequest, NextResponse } from "next/server";

// Middleware ringan (Edge): cukup cek keberadaan cookie sesi.
// Verifikasi JWT penuh dilakukan di server (app/(admin)/layout.tsx -> getSession, Node runtime).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/champion.png";

  const hasCookie = Boolean(req.cookies.get("sjp_session")?.value);

  if (isPublic) {
    if (pathname.startsWith("/login") && hasCookie) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!hasCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/public).*)"],
};
