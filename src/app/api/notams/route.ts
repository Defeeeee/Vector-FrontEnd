import { NextRequest, NextResponse } from "next/server";
import { anacIndicator, controlledFallback } from "@/lib/madhel-reference";



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
  particularNorms: string;
  generalNorms: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const icao = searchParams.get("icao")?.trim().toUpperCase();

  if (!icao || icao.length < 3) {
    return NextResponse.json({ error: "Código ICAO inválido" }, { status: 400 });
  }

  const indicator = anacIndicator(icao);

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
        const fallback = controlledFallback(icao);

        const particularContent = mJson.data?.norms?.particular?.content || "";
        const generalContent = mJson.data?.norms?.general?.content || "";

        // Parse radio frequencies from norms or helpers
        let radioList: string[] = [];
        if (mJson.data?.helpers_system?.radio && mJson.data.helpers_system.radio.length > 0) {
          radioList = mJson.data.helpers_system.radio;
        } else if (particularContent) {
          const freqMatch = particularContent.match(/(?:Frecuencia|canal de llamada|Frec)[^0-9]*(\d+[\,\.]\d+)\s*MHz/i);
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
          particularNorms: particularContent,
          generalNorms: generalContent
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
