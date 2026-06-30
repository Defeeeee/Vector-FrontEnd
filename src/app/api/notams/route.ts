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

interface MadhelData {
  name: string;
  fullName: string;
  state: string;
  fir: string;
  elevation: number;
  condition: string;
  control: string;
  traffic: string;
  status: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const icao = searchParams.get("icao")?.trim().toUpperCase();

  if (!icao || icao.length < 3) {
    return NextResponse.json({ error: "Código ICAO inválido" }, { status: 400 });
  }

  // Find the ANAC indicator
  let indicator = ICAO_TO_ANAC[icao];
  if (!indicator) {
    if (icao.startsWith("SA") || icao.startsWith("SD")) {
      indicator = icao.slice(1); 
    } else {
      indicator = icao;
    }
  }

  let madhel: MadhelData | null = null;
  let notams: NotamItem[] = [];

  // 1. Fetch MADHEL General Info
  try {
    const madhelRes = await fetch(`https://datos.anac.gob.ar/madhel/api/v2/airports/${indicator}/`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 3600 } // Cache MADHEL details for 1 hour
    });

    if (madhelRes.ok) {
      const mJson = await madhelRes.json();
      if (mJson && mJson.metadata) {
        madhel = {
          name: mJson.metadata.identifiers?.icao || icao,
          fullName: mJson.human_readable_identifier || mJson.the_geom?.properties?.name || "",
          state: mJson.metadata.localization?.state || "",
          fir: mJson.metadata.localization?.fir || "",
          elevation: mJson.metadata.localization?.elevation || 0,
          condition: mJson.metadata.condition || "",
          control: mJson.metadata.control || "",
          traffic: mJson.metadata.traffic || "",
          status: mJson.metadata.status || "OK"
        };
      }
    }
  } catch (err) {
    console.error("Error fetching MADHEL data:", err);
  }

  // 2. Fetch NOTAMs from official ANAC JSON service
  try {
    const notamRes = await fetch("https://ais.anac.gob.ar/notam/json", {
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

    if (notamRes.ok) {
      const nJson = await notamRes.json();
      if (Array.isArray(nJson)) {
        notams = nJson.map((item: any) => {
          const rawBody = (item.novedad || "").replace(/<\/?[^>]+(>|$)/g, ""); // Strip HTML tags
          let textRaw = rawBody.trim();
          let textEsp = rawBody.trim();

          if (rawBody.includes("Versión en Español:")) {
            const parts = rawBody.split("Versión en Español:");
            textRaw = parts[0].trim();
            textEsp = parts[1].trim();
          }

          const toVal = item.hasta === "0000-00-00 00:00:00" ? "PERMANENTE" : item.hasta;

          return {
            code: item.notam || "NOTAM",
            from: item.desde || "",
            to: toVal,
            textRaw,
            textEsp
          };
        });
      }
    }
  } catch (err) {
    console.error("Error fetching NOTAMs:", err);
  }

  return NextResponse.json({
    icao,
    indicator,
    madhel,
    notams
  });
}
