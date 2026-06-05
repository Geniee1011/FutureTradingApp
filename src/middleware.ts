import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

/** Trader-portal areas that require any authenticated session. */
const TRADER_PATHS = ["/dashboard", "/trade", "/orders", "/account"];
/** Admin areas that additionally require the admin role. */
const ADMIN_PREFIX = "/admin";

function parseSession(value: string | undefined): { id: string; role: string } | null {
  if (!value) return null;
  const [id, role] = value.split(":");
  if (!id || !role) return null;
  return { id, role };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = parseSession(req.cookies.get(SESSION_COOKIE)?.value);

  const isTraderArea = TRADER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdminArea = pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + "/");

  // Already authenticated users shouldn't see the login page.
  if (pathname === "/login" && session) {
    const home = session.role === "admin" ? "/admin/traders" : "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (isTraderArea || isAdminArea) {
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (isAdminArea && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/trade/:path*", "/orders/:path*", "/account/:path*", "/admin/:path*"],
};
