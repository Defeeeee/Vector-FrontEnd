import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const icao = searchParams.get("icao")?.trim().toUpperCase();

  if (!icao || icao.length < 3) {
    return NextResponse.json({ error: "ICAO code is required" }, { status: 400 });
  }

  try {
    // 1. Fetch METAR in JSON format
    const metarJsonUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`;
    const metarRes = await fetch(metarJsonUrl, {
      headers: { "User-Agent": "Vector-Flight-Log-App" },
      next: { revalidate: 300 } // cache for 5 minutes
    });

    let metarData: any = null;
    let rawMetar = "No disponible";
    let category = "UNK";
    let temp: number | null = null;
    let windSpeed: number | null = null;
    let windDir: string | number | null = null;

    if (metarRes.ok) {
      const json = await metarRes.json();
      if (json && Array.isArray(json) && json.length > 0) {
        metarData = json[0];
        rawMetar = metarData.rawText || metarData.rawOb || "No disponible";
        category = metarData.fltCat || metarData.fltcat || "UNK";
        temp = metarData.temp !== undefined ? metarData.temp : null;
        windSpeed = metarData.wspd !== undefined ? metarData.wspd : null;
        windDir = metarData.wdir !== undefined ? metarData.wdir : null;
      }
    }

    // 2. Fetch TAF in raw format
    const tafRes = await fetch(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=raw`, {
      headers: { "User-Agent": "Vector-Flight-Log-App" },
      next: { revalidate: 300 }
    });
    const rawTaf = tafRes.ok ? await tafRes.text() : "No disponible";

    return NextResponse.json({
      icao,
      metar: rawMetar.trim(),
      taf: rawTaf.trim() || "No disponible",
      category,
      temp,
      windSpeed,
      windDir
    });
  } catch (err: any) {
    console.error("Error fetching weather in api route:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch weather data" }, { status: 500 });
  }
}
