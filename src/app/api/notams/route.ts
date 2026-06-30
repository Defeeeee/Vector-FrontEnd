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

// Fallbacks for controlled airports that don't publish runways/frequencies directly in the MADHEL API
const CONTROLLED_FALLBACKS: Record<string, {
  rwy: string[];
  radio: string[];
  localization: string;
  fuel: string;
  telephone: string[];
}> = {
  SADF: {
    rwy: ["05/23 1800x30 M - Asfalto/Hormigón - Capacidad de soporte: 25t/1 38t/2 70t/4."],
    radio: ["TWR (Torre San Fernando): 118.45 MHz", "GND (Superficie): 121.90 MHz", "COOP (Frec. Común): 123.50 MHz"],
    localization: "3 KM al SO de la ciudad de San Fernando (Pcia. de Buenos Aires)",
    fuel: "AVGAS 100LL, JET A-1",
    telephone: ["(011) 4714-6002 (Torre)", "(011) 4714-6003 (ANAC)"]
  },
  SABE: {
    rwy: ["13/31 2700x45 M - Hormigón - Capacidad de soporte: PCN 60/R/A/W/T."],
    radio: ["TWR (Torre Aeroparque): 119.90 MHz / 120.40 MHz", "GND (Superficie): 121.70 MHz", "ATIS: 127.60 MHz"],
    localization: "En la Ciudad Autónoma de Buenos Aires (Costanera Norte)",
    fuel: "JET A-1",
    telephone: ["(011) 5480-6111 (ANAC)", "(011) 4514-1515 (EANA)"]
  },
  SAEZ: {
    rwy: ["11/29 3300x60 M - Asfalto", "17/35 3105x45 M - Hormigón."],
    radio: ["TWR (Torre Ezeiza): 118.15 MHz / 118.85 MHz", "GND (Superficie): 121.90 MHz", "ATIS: 127.80 MHz", "APP (Control Baires): 124.90 MHz"],
    localization: "2 KM al SW de la ciudad de Ezeiza (Pcia. de Buenos Aires)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(011) 5480-2555 (Torre)", "(011) 5480-2666 (AIS/ARO)"]
  },
  SADP: {
    rwy: ["02/20 1435x50 M - Tierra", "14/32 1435x30 M - Asfalto (Uso restringido)."],
    radio: ["TWR (Torre La Plata): 118.90 MHz", "COOP (Frec. Común): 123.50 MHz"],
    localization: "7 KM al SE de la ciudad de La Plata (Pcia. de Buenos Aires)",
    fuel: "AVGAS 100LL",
    telephone: ["(0221) 486-1554 (Jefatura de Aeródromo)"]
  },
  SADL: {
    rwy: ["16/34 2110x48 M - Hormigón."],
    radio: ["TWR (Torre Palomar): 120.60 MHz", "GND (Superficie): 121.90 MHz"],
    localization: "En El Palomar (Pcia. de Buenos Aires), partido de Morón",
    fuel: "JET A-1",
    telephone: ["(011) 4751-0011 (Fuerza Aérea)"]
  },
  SAZM: {
    rwy: ["13/31 2200x45 M - Hormigón", "03/21 700x30 M - Tierra."],
    radio: ["TWR (Torre Mar del Plata): 118.30 MHz", "ATIS: 127.70 MHz"],
    localization: "7 KM al N de la ciudad de Mar del Plata (Pcia. de Buenos Aires)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0223) 478-5800 (Torre)"]
  },
  SAZS: {
    rwy: ["11/29 2200x45 M - Hormigón."],
    radio: ["TWR (Torre Bariloche): 118.00 MHz", "ATIS: 127.90 MHz", "APP (Aproximación): 120.10 MHz"],
    localization: "13 KM al E de la ciudad de San Carlos de Bariloche (Pcia. de Río Negro)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0294) 440-5016 (AIS/ARO)"]
  },
  SACO: {
    rwy: ["01/19 3200x45 M - Hormigón", "05/23 2280x45 M - Asfalto."],
    radio: ["TWR (Torre Córdoba): 118.50 MHz / 118.95 MHz", "GND: 121.90 MHz", "ATIS: 127.60 MHz", "APP (Córdoba Radar): 119.10 MHz"],
    localization: "9 KM al N de la ciudad de Córdoba (Pcia. de Córdoba)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0351) 475-0214 (AIS/ARO)"]
  },
  SAAR: {
    rwy: ["02/20 3000x45 M - Hormigón."],
    radio: ["TWR (Torre Rosario): 118.20 MHz", "GND: 121.75 MHz", "ATIS: 127.90 MHz"],
    localization: "11 KM al W de la ciudad de Rosario (Pcia. de Santa Fe)",
    fuel: "JET A-1, AVGAS 100LL",
    telephone: ["(0341) 451-6300 (Jefatura de Aeródromo)"]
  }
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
  runways: string[];
  radio: string[];
  localization: string;
  fuel: string;
  telephone: string[];
  norms: string;
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
        const fallback = CONTROLLED_FALLBACKS[icao];

        // Parse radio frequencies from norms or helpers
        let radioList: string[] = [];
        if (mJson.data?.helpers_system?.radio && mJson.data.helpers_system.radio.length > 0) {
          radioList = mJson.data.helpers_system.radio;
        } else if (mJson.data?.norms?.particular?.content) {
          const freqMatch = mJson.data.norms.particular.content.match(/(?:Frecuencia|canal de llamada|Frec)\s*(\d+[\,\.]\d+)\s*MHz/i);
          if (freqMatch) {
            radioList = [`Frecuencia común: ${freqMatch[1]} MHz`];
          }
        }

        let locStr = mJson.data?.human_readable_localization || "";
        if (locStr.includes("***Consultar en el sitio web")) {
          locStr = ""; // Clear the useless AIP reference string
        }

        madhel = {
          name: mJson.metadata.identifiers?.icao || icao,
          fullName: mJson.human_readable_identifier || mJson.the_geom?.properties?.name || "",
          state: mJson.metadata.localization?.state || "",
          fir: mJson.metadata.localization?.fir || "",
          elevation: mJson.metadata.localization?.elevation || 0,
          condition: mJson.metadata.condition || "",
          control: mJson.metadata.control || "",
          traffic: mJson.metadata.traffic || "",
          status: mJson.metadata.status || "OK",
          
          // Detail fields
          runways: fallback ? fallback.rwy : (mJson.data?.rwy || []),
          radio: fallback ? fallback.radio : radioList,
          localization: fallback ? fallback.localization : locStr,
          fuel: fallback ? fallback.fuel : (mJson.data?.fuel || "No especificado"),
          telephone: fallback ? fallback.telephone : (mJson.data?.telephone || []),
          norms: mJson.data?.norms?.particular?.content || ""
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
