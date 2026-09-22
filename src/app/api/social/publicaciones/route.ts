import { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const res = await apiFetch("/social/publicaciones", {
    method: "POST",
    body: formData,
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    return new Response(errorText, { status: res.status });
  }
  
  const data = await res.json();
  return Response.json(data);
}
