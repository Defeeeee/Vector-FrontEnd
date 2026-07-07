import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;

  const isDashboardPage = pathname.startsWith("/dashboard");
  const isAuthCallback = pathname.startsWith("/auth/callback");

  if (isAuthCallback) {
    return NextResponse.next();
  }

  // Define logout API as a path that shouldn't be redirected
  const isLogoutPath = pathname.startsWith("/api/auth/logout");
  if (isLogoutPath) {
    return NextResponse.next();
  }

  if (isDashboardPage && !token) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "vector.fdiaznem.com.ar";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const redirectUrl = new URL("/", `${proto}://${host}`);
    redirectUrl.searchParams.set("expired", "true");
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/" && token) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "vector.fdiaznem.com.ar";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const redirectUrl = new URL("/dashboard", `${proto}://${host}`);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
