import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/";
  
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  cookieStore.delete("refresh_token");
  
  // Use relative redirect if possible, otherwise use original request.url to construct URL
  // But constructing a URL from a relative path if redirect(redirectTo) doesn't work.
  // In Route Handlers, redirect() from next/navigation is the preferred way.
  
  return redirect(redirectTo);
}
