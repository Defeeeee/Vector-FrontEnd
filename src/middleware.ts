import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isAuthCallback = pathname.startsWith("/auth/callback");

  console.log(`Middleware: path=${pathname} hasToken=${!!token}`);

  if (isAuthCallback) {
    return NextResponse.next();
  }

  // Define logout API as a path that shouldn't be redirected
  const isLogoutPath = pathname.startsWith("/api/auth/logout");
  if (isLogoutPath) {
    return NextResponse.next();
  }

  if (isDashboardPage && !token) {
    console.log("Middleware: Redirecting to / due to missing token on dashboard");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("expired", "true");
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/" && token) {
    console.log("Middleware: Redirecting to /dashboard due to existing token");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
