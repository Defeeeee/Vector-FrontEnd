import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/";
  
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  cookieStore.delete("refresh_token");
  
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
