import { NextRequest, NextResponse } from "next/server";

// Mapping of common ICAO codes to ANAC local indicators
const ICAO_TO_ANAC: Record<string, string> = {
  SABE: "AER", // Aeroparque
  SADF: "FDO", // San Fernando
  SAEZ: "EZE", // Ezeiza
  SADP: "PTA", // La Plata
  SADL: "PAL", // El Palomar
  SADQ: "ILM", // Quilmes
  SAZM: "MDP", // Mar del Plata
  SAZS: "BAR", // Bariloche
  SACO: "FMA", // Córdoba
  SAAR: "ROS", // Rosario
  SANC: "CAT", // Catamarca
  SARI: "IGU", // Iguazú
  SAVC: "CRV", // Comodoro Rivadavia
  SAZB: "BCA", // Bahía Blanca
  SAVT: "TRE", // Trelew
  SANT: "TUC", // Tucumán
  SAWE: "USU", // Ushuaia
  SAZY: "ECA", // El Calafate
  SAWG: "GAL", // Río Gallegos
  SAWC: "CAL", // El Calafate (old/other)
  SAWD: "MAD", // Puerto Madryn
  SASA: "SAL", // Salta
  SANU: "JUA", // San Juan
  SAOU: "UIS", // San Luis
  SAMR: "SRA", // San Rafael
  SFDO: "FDO", // Fallback for San Fernando
};

interface NotamItem {
  code: string;
  from: string;
  to: string;
  textRaw: string;
  textEsp: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const icao = searchParams.get("icao")?.trim().toUpperCase();

  if (!icao || icao.length < 3) {
    return NextResponse.json({ error: "Código ICAO inválido" }, { status: 400 });
  }

  // Find the ANAC indicator. If not in dictionary, try mapping last 3 letters or default to FIR Ezeiza (-EF)
  let indicator = ICAO_TO_ANAC[icao];
  if (!indicator) {
    if (icao.startsWith("SA") || icao.startsWith("SD")) {
      // Common pattern: SAEZ -> EZE, SANU -> JUA (not always, but good fallback)
      // If we don't have it, we return empty list or fallback to FIR Ezeiza
      indicator = icao.slice(1); 
    } else {
      indicator = icao;
    }
  }

  try {
    const response = await fetch("https://ais.anac.gob.ar/notam/pib", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://ais.anac.gob.ar/notam",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: `indicador=${encodeURIComponent(indicator)}`,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Error en portal ANAC: ${response.status}`);
    }

    const html = await response.text();

    // Check if we got the 404 or empty pib
    if (html.includes("Error 404") || html.includes("No existe la página")) {
      return NextResponse.json({ notams: [], indicator, message: "No se encontraron NOTAMs activos para esta estación." });
    }

    // Parse the HTML table using Regex
    const notams: NotamItem[] = [];
    const rowRegex = /<tr>\s*<td id="place">([\s\S]*?)<\/td>\s*<td id="info">([\s\S]*?)<\/td>\s*<\/tr>/g;
    
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const placeHtml = match[1];
      const infoHtml = match[2];

      // Extract NOTAM Code: e.g. A1878/2026
      const codeMatch = placeHtml.match(/<p>\s*([A-Z]\d{4}\/\d{4})\s*<\/p>/);
      const code = codeMatch ? codeMatch[1].trim() : "NOTAM";

      // Extract Desde (From)
      const fromMatch = infoHtml.match(/Desde:\s*([^<]+)/);
      const from = fromMatch ? fromMatch[1].trim() : "";

      // Extract Hasta (To)
      const toMatch = infoHtml.match(/Hasta:\s*([^<]+)/);
      const to = toMatch ? toMatch[1].trim() : "";

      // Extract text content and split Spanish version if exists
      // Get the third <p> inside the td info
      const pMatches = infoHtml.match(/<p>([\s\S]*?)<\/p>/g);
      let textRaw = "";
      let textEsp = "";

      if (pMatches && pMatches.length >= 3) {
        // The 3rd <p> contains the body
        const rawBody = pMatches[2].replace(/<\/?[^>]+(>|$)/g, ""); // Strip any inner HTML tags
        textRaw = rawBody.trim();

        // Split by Spanish version indicator
        if (rawBody.includes("Versión en Español:")) {
          const parts = rawBody.split("Versión en Español:");
          textRaw = parts[0].trim();
          textEsp = parts[1].trim();
        } else {
          textEsp = textRaw;
        }
      }

      notams.push({
        code,
        from,
        to,
        textRaw,
        textEsp
      });
    }

    return NextResponse.json({
      icao,
      indicator,
      count: notams.length,
      notams
    });

  } catch (err: any) {
    console.error("NOTAM Scraper error:", err);
    return NextResponse.json({ error: "Error al obtener NOTAMs: " + err.message }, { status: 500 });
  }
}
