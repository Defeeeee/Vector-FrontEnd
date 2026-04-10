import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/";
  
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  cookieStore.delete("refresh_token");
  
  const url = request.nextUrl.clone();
  url.pathname = redirectTo.split('?')[0];
  const search = redirectTo.split('?')[1];
  url.search = search ? `?${search}` : "";
  
  return NextResponse.redirect(url);
}
