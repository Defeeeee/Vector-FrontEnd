import { NextRequest, NextResponse } from "next/server";
import { getAirport } from "@/lib/airports";
import { distanceNm } from "@/lib/distance";

const METAR_STATIONS = [
  { icao: "SADM", name: "Morón", lat: -34.676, lon: -58.643 },
  { icao: "SADP", name: "El Palomar", lat: -34.6097, lon: -58.6125 },
  { icao: "SADF", name: "San Fernando", lat: -34.4533, lon: -58.5897 },
  { icao: "SABE", name: "Aeroparque", lat: -34.5592, lon: -58.4156 },
  { icao: "SAEZ", name: "Ezeiza", lat: -34.8222, lon: -58.5358 },
  { icao: "SADL", name: "La Plata", lat: -34.9722, lon: -57.8944 },
  { icao: "SAZM", name: "Mar del Plata", lat: -37.9342, lon: -57.5733 },
  { icao: "SAZS", name: "Bariloche", lat: -41.1511, lon: -71.1575 },
  { icao: "SACO", name: "Córdoba", lat: -31.3236, lon: -64.2081 },
  { icao: "SACD", name: "Coronel Olmedo", lat: -31.4886, lon: -64.1558 },
  { icao: "SAAR", name: "Rosario", lat: -32.9036, lon: -60.785 },
  { icao: "SANC", name: "Catamarca", lat: -28.5925, lon: -65.7514 },
  { icao: "SARI", name: "Iguazú", lat: -25.7372, lon: -54.4736 },
  { icao: "SAVC", name: "Comodoro Rivadavia", lat: -45.7853, lon: -67.4656 },
  { icao: "SAZB", name: "Bahía Blanca", lat: -38.725, lon: -62.1694 },
  { icao: "SAVT", name: "Trelew", lat: -43.2106, lon: -65.2703 },
  { icao: "SANT", name: "Tucumán", lat: -26.8408, lon: -65.1047 },
  { icao: "SAWE", name: "Ushuaia", lat: -54.8433, lon: -68.2958 },
  { icao: "SAZY", name: "El Calafate", lat: -50.2803, lon: -72.0531 },
  { icao: "SAWG", name: "Río Gallegos", lat: -51.6089, lon: -69.3128 },
  { icao: "SASA", name: "Salta", lat: -24.856, lon: -65.4861 },
  { icao: "SANU", name: "San Juan", lat: -31.5714, lon: -68.4181 },
  { icao: "SAOU", name: "San Luis", lat: -33.2731, lon: -66.3578 },
  { icao: "SAMR", name: "San Rafael", lat: -34.5883, lon: -68.4028 },
  { icao: "SAME", name: "Mendoza", lat: -32.8317, lon: -68.7928 },
  { icao: "SAAV", name: "Sauce Viejo / Santa Fe", lat: -31.7117, lon: -60.8117 },
  { icao: "SAAP", name: "Paraná", lat: -31.7947, lon: -60.4803 },
  { icao: "SARE", name: "Resistencia", lat: -27.4456, lon: -59.0561 },
  { icao: "SARC", name: "Corrientes", lat: -27.4456, lon: -58.7619 },
  { icao: "SAGO", name: "Goya", lat: -29.1058, lon: -59.2175 },
  { icao: "SANI", name: "Tinogasta", lat: -28.0631, lon: -67.5644 },
  { icao: "SATR", name: "Reconquista", lat: -29.2108, lon: -59.6797 },
];

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
    let nearestStation: { icao: string; name: string; distanceNm: number } | null = null;

    if (metarRes.ok) {
      const text = await metarRes.text();
      if (text.trim().length > 0) {
        try {
          const json = JSON.parse(text);
          if (json && Array.isArray(json) && json.length > 0) {
            metarData = json[0];
            rawMetar = metarData.rawText || metarData.rawOb || "No disponible";
            category = metarData.fltCat || metarData.fltcat || "UNK";
            temp = metarData.temp !== undefined ? metarData.temp : null;
            windSpeed = metarData.wspd !== undefined ? metarData.wspd : null;
            windDir = metarData.wdir !== undefined ? metarData.wdir : null;
          }
        } catch (parseErr) {
          console.error("Error parsing weather JSON:", parseErr);
        }
      }
    }

    // If no direct METAR was found, search for the nearest station
    if (rawMetar === "No disponible") {
      const targetAirport = getAirport(icao);
      if (targetAirport && targetAirport.lat !== undefined && targetAirport.lon !== undefined) {
        const sorted = METAR_STATIONS.map((st) => ({
          ...st,
          dist: distanceNm(targetAirport.lat!, targetAirport.lon!, st.lat, st.lon),
        })).sort((a, b) => a.dist - b.dist);

        const candidates = sorted.slice(0, 4);
        const candIds = candidates.map((c) => c.icao).join(",");

        try {
          const candRes = await fetch(`https://aviationweather.gov/api/data/metar?ids=${candIds}&format=json`, {
            headers: { "User-Agent": "Vector-Flight-Log-App" },
            next: { revalidate: 300 },
          });

          if (candRes.ok) {
            const candText = await candRes.text();
            if (candText.trim().length > 0) {
              const candJson = JSON.parse(candText);
              if (Array.isArray(candJson) && candJson.length > 0) {
                // Pick the first available candidate METAR
                for (const candidate of candidates) {
                  const match = candJson.find((item: any) => item.icaoId === candidate.icao);
                  if (match) {
                    rawMetar = match.rawText || match.rawOb || "No disponible";
                    category = match.fltCat || match.fltcat || "UNK";
                    temp = match.temp !== undefined ? match.temp : null;
                    windSpeed = match.wspd !== undefined ? match.wspd : null;
                    windDir = match.wdir !== undefined ? match.wdir : null;
                    nearestStation = {
                      icao: candidate.icao,
                      name: candidate.name,
                      distanceNm: candidate.dist,
                    };
                    break;
                  }
                }
              }
            }
          }
        } catch (candErr) {
          console.error("Error fetching nearest METAR candidate:", candErr);
        }
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
      windDir,
      nearestStation,
    });
  } catch (err: any) {
    console.error("Error fetching weather in api route:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch weather data" }, { status: 500 });
  }
}
