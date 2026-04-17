import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;
  
  // Debug headers
  console.log("Middleware Debug:", {
    pathname,
    host: request.headers.get("host"),
    xForwardedHost: request.headers.get("x-forwarded-host"),
    xForwardedProto: request.headers.get("x-forwarded-proto"),
    url: request.url,
    nextUrl: request.nextUrl.toString()
  });

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
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "vector.fdiaznem.com.ar";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const redirectUrl = new URL("/", `${proto}://${host}`);
    redirectUrl.searchParams.set("expired", "true");
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/" && token) {
    console.log("Middleware: Redirecting to /dashboard due to existing token");
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
