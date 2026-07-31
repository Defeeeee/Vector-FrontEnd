import { NextRequest, NextResponse } from "next/server";
import { getAirport, searchAirports } from "@/lib/airports";

/**
 * GET /api/airports/search?q=SADM        -> suggestions, best match first
 * GET /api/airports/search?icao=SADM     -> single exact resolve (404 if unknown)
 *
 * Backed by the in-memory directory in src/lib/airports.ts, so this answers in
 * well under a millisecond once warm. It's hit on every keystroke (debounced by
 * AirportResolver), which is why it never leaves the process.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const icao = searchParams.get("icao");
  if (icao) {
    const airport = getAirport(icao);
    if (!airport) {
      return NextResponse.json({ error: "Aeródromo no encontrado" }, { status: 404 });
    }
    return NextResponse.json(airport, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const limit = Math.min(Number(searchParams.get("limit")) || 8, 25);

  return NextResponse.json(
    { results: searchAirports(q, limit) },
    // The dataset only changes when the generator is re-run, so the browser can
    // hold on to a query's answer for a day.
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
}
