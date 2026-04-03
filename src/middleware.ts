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

  if (isDashboardPage && !token) {
    console.log("Middleware: Redirecting to / due to missing token");
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (request.nextUrl.pathname === "/" && token) {
    console.log("Middleware: Redirecting to /dashboard due to existing token");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
