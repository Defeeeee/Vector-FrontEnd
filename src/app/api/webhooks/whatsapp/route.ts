import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { calculateFlightDuration } from "@/lib/utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function sendWhatsAppMessage(to: string, text: string, dynamicPhoneId?: string) {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID || dynamicPhoneId;

  if (!apiKey || !phoneNumberId) {
    console.error("Missing Kapso API configuration (KAPSO_API_KEY or KAPSO_PHONE_NUMBER_ID)");
    return;
  }

  const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          body: text
        }
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Error sending WhatsApp message via Kapso:", errText, "URL:", url);
    }
  } catch (err) {
    console.error("Failed to send WhatsApp message:", err);
  }
}

function formatForWhatsApp(text: string): string {
  let formatted = text;

  // 1. Convert headers (e.g. ### Title) to bold uppercase titles: *TITLE*
  formatted = formatted.replace(/^(#{1,6})\s+(.*?)$/gm, (match, hashes, title) => {
    return `\n*${title.trim().toUpperCase()}*\n`;
  });

  // 2. Convert markdown bold (**text**) to WhatsApp bold (*text*)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "*$1*");

  // 3. Remove horizontal rules
  formatted = formatted.replace(/^\s*[-*_]{3,}\s*$/gm, "\n*~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~*\n");

  // 4. Format bullet lists: convert lines starting with `* ` or `- ` (plus optional whitespace) to `• ` and strip extra indentation
  formatted = formatted.replace(/^\s*[-*]\s+(.*?)$/gm, "• $1");

  // 5. Clean up numbered lists (remove extra spaces between number and text)
  formatted = formatted.replace(/^\s*(\d+)\.\s+(.*?)$/gm, "$1. $2");

  // 6. Format Markdown links [text](url) to "text (url)" or "text: url"
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, "$1: $2");

  // 7. Remove excessive vertical whitespace (more than 2 consecutive newlines)
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted.trim();
}

// Helper to fetch MADHEL and NOTAMs directly from official sources
async function getAirportInfoHelper(icao: string) {
  const code = icao.trim().toUpperCase();
  
  // Mapping of common ICAO codes to ANAC local indicators
  const ICAO_TO_ANAC: Record<string, string> = {
    SABE: "AER", SADF: "FDO", SAEZ: "EZE", SADP: "PTA", SADL: "PAL",
    SADQ: "ILM", SAAK: "MGI", SRDR: "GEZ", SAZM: "MDP", SAZS: "BAR",
    SACO: "FMA", SAAR: "ROS", SANC: "CAT", SARI: "IGU", SAVC: "CRV",
    SAZB: "BCA", SAVT: "TRE", SANT: "TUC", SAWE: "USU", SAZY: "ECA",
    SAWG: "GAL", SAWC: "CAL", SAWD: "MAD", SASA: "SAL", SANU: "JUA",
    SAOU: "UIS", SAMR: "SRA", SFDO: "FDO",
    // 3-letter direct mappings
    MGI: "MGI", FDO: "FDO", GEZ: "GEZ", AER: "AER", EZE: "EZE",
    PTA: "PTA", PAL: "PAL", ILM: "ILM", MDP: "MDP", BAR: "BAR",
    ROS: "ROS", TUC: "TUC", CRV: "CRV", TRE: "TRE", USU: "USU",
    GAL: "GAL", SAL: "SAL"
  };

  let indicator = ICAO_TO_ANAC[code];
  if (!indicator) {
    if (code.startsWith("SA") || code.startsWith("SD") || code.startsWith("SR") || code.startsWith("SF")) {
      indicator = code.slice(1);
    } else if (code.length === 4 && code.startsWith("S") && !code.startsWith("SA")) {
      const stripped = code.slice(1);
      indicator = ICAO_TO_ANAC[stripped] || stripped;
    } else {
      indicator = code;
    }
  }

  // Fallbacks for controlled airports
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

  let madhelSummary = "No se encontraron datos MADHEL para este aeródromo.";
  let notamSummary = "Sin NOTAMs activos.";

  // Fetch MADHEL
  try {
    const madhelRes = await fetch(`https://datos.anac.gob.ar/madhel/api/v2/airports/${indicator}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    });

    if (madhelRes.ok) {
      const mJson = await madhelRes.json();
      if (mJson && mJson.metadata) {
        const fallback = CONTROLLED_FALLBACKS[code] || CONTROLLED_FALLBACKS[mJson.metadata.identifiers?.icao];
        let radioList: string[] = [];
        if (mJson.data?.helpers_system?.radio && mJson.data.helpers_system.radio.length > 0) {
          radioList = mJson.data.helpers_system.radio;
        } else if (mJson.data?.norms?.particular?.content) {
          const freqMatch = mJson.data.norms.particular.content.match(/(?:Frecuencia|canal de llamada|Frec)\s*(\d+[\,\.]\d+)\s*MHz/i);
          if (freqMatch) radioList = [`Frecuencia común: ${freqMatch[1]} MHz`];
        }

        let locStr = mJson.data?.human_readable_localization || "";
        if (locStr.includes("***Consultar en el sitio web")) locStr = "";

        const m = {
          fullName: mJson.human_readable_identifier || mJson.the_geom?.properties?.name || code,
          state: mJson.metadata.localization?.state || "",
          fir: mJson.metadata.localization?.fir || "",
          elevation: mJson.metadata.localization?.elevation || 0,
          condition: mJson.metadata.condition || "",
          control: mJson.metadata.control || "",
          traffic: mJson.metadata.traffic || "",
          runways: fallback ? fallback.rwy : (mJson.data?.rwy || []),
          radio: fallback ? fallback.radio : radioList,
          localization: fallback ? fallback.localization : locStr,
          fuel: fallback ? fallback.fuel : (mJson.data?.fuel || "No especificado"),
          telephone: mJson.data?.telephone || [],
          norms: mJson.data?.norms?.particular?.content || ""
        };

        madhelSummary = [
          `Aeródromo: ${m.fullName}`,
          `Estado: ${m.state || "Desconocido"}`,
          `FIR: ${m.fir || "Desconocido"}`,
          `Elevación: ${m.elevation}m (${Math.round(m.elevation * 3.28084)}ft)`,
          `Condición: ${m.condition}`,
          `Control: ${m.control}`,
          `Tráfico: ${m.traffic}`,
          `Pistas: ${m.runways?.length > 0 ? m.runways.join(" | ") : "No especificadas"}`,
          `Frecuencias: ${m.radio?.length > 0 ? m.radio.join(" | ") : "No especificadas"}`,
          `Ubicación: ${m.localization || "No especificada"}`,
          `Combustible: ${m.fuel || "No especificado"}`,
          `Teléfonos: ${m.telephone?.length > 0 ? m.telephone.join(", ") : "No especificados"}`,
          m.norms ? `Normas Particulares: ${m.norms}` : ""
        ].filter(Boolean).join("\n");
      }
    }
  } catch (e: any) {
    console.error("Error fetching MADHEL in helper:", e);
    madhelSummary = `Error consultando MADHEL: ${e.message}`;
  }

  // Fetch NOTAMs
  try {
    const notamRes = await fetch("https://ais.anac.gob.ar/notam/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://ais.anac.gob.ar/notam",
        "User-Agent": "Mozilla/5.0"
      },
      body: `indicador=${encodeURIComponent(indicator)}`
    });

    if (notamRes.ok) {
      const nJson = await notamRes.json();
      if (Array.isArray(nJson) && nJson.length > 0) {
        notamSummary = nJson.map((item: any, i: number) => {
          const rawBody = (item.novedad || "").replace(/<\/?[^>]+(>|$)/g, "").trim();
          let textEsp = rawBody;
          if (rawBody.includes("Versión en Español:")) {
            textEsp = rawBody.split("Versión en Español:")[1].trim();
          }
          const toVal = item.hasta === "0000-00-00 00:00:00" ? "PERMANENTE" : item.hasta;
          return `NOTAM ${i + 1} [${item.notam || "NOTAM"}] Desde: ${item.desde || ""} | Hasta: ${toVal}\n${textEsp}`;
        }).join("\n\n");
      } else {
        notamSummary = "Sin NOTAMs activos.";
      }
    }
  } catch (e: any) {
    console.error("Error fetching NOTAMs in helper:", e);
    notamSummary = `Error consultando NOTAMs: ${e.message}`;
  }

  return {
    madhel: madhelSummary,
    notams: notamSummary
  };
}

function buildFlightContext(
  flights: any[],
  aircraft: any[],
  profile: any,
  packs: any[],
  transactions: any[],
  balance: number,
  session: any
): string {
  const aircraftMap = new Map(aircraft.map((a: any) => [a.id, a]));
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const totalHours = flights.reduce((s: number, f: any) => s + f.duration, 0);
  const totalLandings = flights.reduce((s: number, f: any) => s + f.landings, 0);

  const hoursPerAircraft = new Map<string, number>();
  for (const f of flights) {
    const ac = f.aircraft_id ? aircraftMap.get(f.aircraft_id) : undefined;
    const key = ac ? `${ac.registration} (${ac.icao})` : "Desconocida";
    hoursPerAircraft.set(key, (hoursPerAircraft.get(key) || 0) + f.duration);
  }

  const routeFreq = new Map<string, number>();
  for (const f of flights) {
    const r = f.route.trim().toUpperCase();
    routeFreq.set(r, (routeFreq.get(r) || 0) + 1);
  }

  const topRoutes = Array.from(routeFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([r, n]) => `${r} (${n} veces)`)
    .join(", ");

  const flightLines = [...flights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((f: any) => {
      const ac = f.aircraft_id ? aircraftMap.get(f.aircraft_id) : undefined;
      const d = new Date(f.date + "T00:00:00");
      const label = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const acStr = ac ? `${ac.registration} (${ac.icao}, ${ac.type_acft || "MONT-T"})` : "aeronave desconocida";
      const times = f.takeoff && f.landing
        ? ` | Salida ${f.takeoff.slice(11, 16)} UTC - Llegada ${f.landing.slice(11, 16)} UTC`
        : "";
      const cols = [
        f.pic_day_loc   ? `PIC diurno local ${f.pic_day_loc}h` : "",
        f.pic_day_tra   ? `PIC diurno traslado ${f.pic_day_tra}h` : "",
        f.pic_night_loc ? `PIC nocturno local ${f.pic_night_loc}h` : "",
        f.pic_night_tra ? `PIC nocturno traslado ${f.pic_night_tra}h` : "",
        f.sic_day_loc   ? `SIC diurno local ${f.sic_day_loc}h` : "",
        f.imc_pil       ? `IMC piloto ${f.imc_pil}h` : "",
        f.capota        ? `Capotaje ${f.capota}h` : "",
      ].filter(Boolean).join(", ");
      return `- [ID: ${f.id}] ${label}: ${f.route.toUpperCase()} | ${acStr} | ${f.duration}h | ${f.landings} aterrizajes${times}${cols ? " | " + cols : ""}`;
    })
    .join("\n");

  const acSummary = Array.from(hoursPerAircraft.entries())
    .map(([k, h]) => `${k}: ${h.toFixed(1)}h`)
    .join("; ");

  const txLines = transactions.slice(0, 5).map((t: any) => {
    return `- [${t.type.toUpperCase()}] ${new Date(t.created_at).toLocaleDateString("es-AR")}: $${t.amount} | ${t.description || ""}`;
  }).join("\n");

  const packLines = packs.map((p: any) => {
    const acRegs = p.aircraft_ids.map((aid: string) => aircraftMap.get(aid)?.registration || "Avión").join(", ");
    return `- Pack "${p.name}": ${p.remaining_hours.toFixed(1)} hs restantes de ${p.total_hours.toFixed(1)} hs totales (aviones: ${acRegs}) | ${p.is_active ? "Activo" : "Inactivo"}`;
  }).join("\n");

  const activeSessionStr = session?.active 
    ? `Sí, activo en ${aircraftMap.get(session.session.aircraft_id)?.registration || "Desconocido"} desde las ${new Date(session.session.start_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`
    : "No hay vuelo en curso.";

  return `
## Perfil del piloto
Nombre: ${profile ? `${profile.first_name} ${profile.last_name}` : "Desconocido"}
Licencia: ${profile?.license_type || "No especificada"}
Vencimiento CMA: ${profile?.cma_expiry || "No especificado"}
Modo de seguimiento: ${profile?.tracking_mode === "balance" ? "Saldo en Cuenta ($)" : "Packs de Horas"}

## Estado Financiero (Modo Saldo en Cuenta)
Saldo disponible en cuenta: $ ${balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
Últimos movimientos de dinero:
${txLines || "(Sin transacciones registradas)"}

## Packs de Horas (Modo Packs de Horas)
${packLines || "(Sin packs de horas registrados)"}

## Vuelo en Vivo (Flight Helper)
Vuelo actual en curso: ${activeSessionStr}

## Resumen estadístico de bitácora
Total vuelos registrados: ${flights.length}
Total horas voladas: ${totalHours.toFixed(1)}h
Total aterrizajes: ${totalLandings}
Aeronaves usadas: ${aircraft.map((a: any) => `${a.registration} (${a.icao}, ${a.type})`).join("; ")}
Horas por aeronave: ${acSummary}
Rutas más frecuentes: ${topRoutes}
Vuelo más largo: ${flights.length > 0 ? Math.max(...flights.map((f: any) => f.duration)).toFixed(1) + "h" : "0h"}
Promedio por vuelo: ${flights.length > 0 ? (totalHours / flights.length).toFixed(1) + "h" : "0h"}

## Registro completo de vuelos (${flights.length} vuelos)
${flightLines}
`.trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === (process.env.WHATSAPP_VERIFY_TOKEN || "vector-verify")) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }
  return new Response("OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  let fromNumber = "";
  let payloadPhoneNumberId = "";
  try {
    const body = await req.json();
    console.log("Incoming WhatsApp Webhook Payload:", JSON.stringify(body, null, 2));

    let messageText = "";
    let mediaId = "";
    let audioMimeType = "";

    // Parse Kapso format or Meta raw format
    if (body.message) {
      fromNumber = body.message.from || body.conversation?.phone_number || "";
      payloadPhoneNumberId = body.phone_number_id || body.conversation?.phone_number_id || "";
      if (body.message.type === "audio" && body.message.audio) {
        mediaId = body.message.audio.id;
        audioMimeType = body.message.audio.mime_type || "audio/ogg";
      } else {
        messageText = body.message.text?.body || body.message.kapso?.content || "";
      }
    } else if (body.event === "whatsapp.message.received" && body.data) {
      fromNumber = body.data.from;
      messageText = body.data.text?.body || "";
    } else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      fromNumber = msg.from;
      payloadPhoneNumberId = body.entry[0].changes[0].value.metadata?.phone_number_id || "";
      if (msg.type === "audio" && msg.audio) {
        mediaId = msg.audio.id;
        audioMimeType = msg.audio.mime_type || "audio/ogg";
      } else {
        messageText = msg.text?.body || "";
      }
    }

    let audioBuffer: Buffer | null = null;
    if (mediaId) {
      console.log(`Processing incoming WhatsApp audio. MediaID: ${mediaId}, MimeType: ${audioMimeType}`);
      try {
        const mediaRes = await fetch(`https://api.kapso.ai/meta/whatsapp/v24.0/${mediaId}?phone_number_id=${payloadPhoneNumberId || "597907523413541"}`, {
          headers: { "X-API-Key": process.env.KAPSO_API_KEY || "" }
        });
        if (mediaRes.ok) {
          const mediaMeta = await mediaRes.json();
          const downloadUrl = mediaMeta.download_url;
          if (downloadUrl) {
            const audioFileRes = await fetch(downloadUrl);
            if (audioFileRes.ok) {
              const arrayBuffer = await audioFileRes.arrayBuffer();
              audioBuffer = Buffer.from(arrayBuffer);
              console.log(`Successfully downloaded audio binary. Size: ${audioBuffer.length} bytes`);
            } else {
              console.error(`Failed to download audio file from Kapso CDN. Status: ${audioFileRes.status}`);
            }
          } else {
            console.error("Kapso media metadata response does not contain a download_url");
          }
        } else {
          console.error(`Failed to fetch media metadata from Kapso. Status: ${mediaRes.status}`);
        }
      } catch (err) {
        console.error("Error retrieving media from Kapso:", err);
      }
    }

    if (!fromNumber || (!messageText.trim() && !audioBuffer)) {
      return NextResponse.json({ success: true, message: "Ignored (empty values)" });
    }

    // Fetch user dashboard data from Python backend using WhatsApp phone number
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET || "shared-vector-secret-2026";
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.flightlog.fdiaznem.com.ar";

    const userRes = await fetch(`${API_URL}/whatsapp/user-data?phone=${fromNumber}&secret=${secret}`);
    if (!userRes.ok) {
      const errText = await userRes.text().catch(() => "");
      console.error("Failed to fetch user-data from backend. Status:", userRes.status, "Body:", errText, "URL:", userRes.url);
      await sendWhatsAppMessage(
        fromNumber,
        "Hola 🛩️ Tu número de WhatsApp no está asociado a ningún piloto en Vector. Ingresá a la web, ve a tu Perfil y vinculá tu número en el campo 'WhatsApp (para Copiloto IA)'.",
        payloadPhoneNumberId
      );
      return NextResponse.json({ success: true });
    }

    const userData = await userRes.json();
    const userApiKey = userData.profile.api_key;
    if (!userApiKey) {
      await sendWhatsAppMessage(
        fromNumber,
        "Hola 🛩️ Tu cuenta no tiene un token de acceso activo. Ingresá a la web y genera tu token en el perfil.",
        payloadPhoneNumberId
      );
      return NextResponse.json({ success: true });
    }

    const flights = userData.flights || [];
    const aircraft = userData.aircraft || [];
    const profile = userData.profile || null;
    const packs = userData.packs || [];
    const transactions = userData.transactions || [];
    const balance = userData.balance || 0;
    const session = userData.session || { active: false };

    // Fetch chat history from Python backend
    const historyRes = await fetch(`${API_URL}/whatsapp/chat-history?phone=${fromNumber}&secret=${secret}`);
    let history: any[] = [];
    if (historyRes.ok) {
      const histData = await historyRes.json();
      history = histData.history || [];
    }

    // Check for history clearing commands
    const cleanMsg = messageText.toLowerCase().trim();
    if (cleanMsg === "borrar historial" || cleanMsg === "reiniciar chat" || cleanMsg === "limpiar chat") {
      await fetch(`${API_URL}/whatsapp/chat-history?phone=${fromNumber}&secret=${secret}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: [] })
      });
      await sendWhatsAppMessage(
        fromNumber,
        "Hola 🛩️ He borrado tu historial de conversación con el Copiloto IA. El chat ha sido reiniciado y listo para consultar el clima.",
        payloadPhoneNumberId
      );
      return NextResponse.json({ success: true });
    }

    const flightContext = buildFlightContext(
      flights,
      aircraft,
      profile,
      packs,
      transactions,
      balance,
      session
    );

    const todayStr = new Date().toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const [d, m, y] = todayStr.split("/");
    const currentLocalDate = `${y}-${m}-${d}`;

    const systemPrompt = `Eres un asistente de aviación inteligente integrado en Vector, una aplicación de bitácora de vuelo.
Estás interactuando con el piloto a través de WHATSAPP.
Tu rol es ayudar al piloto a analizar su historial de vuelos, estadísticas, responder preguntas, y también puedes EDITAR, REGISTRAR o ELIMINAR vuelos del libro de vuelo usando tus herramientas integradas.

Responde siempre en español, de forma concisa y clara. Usa emojis cuando sean útiles.

La fecha actual de hoy es: ${currentLocalDate} (formato YYYY-MM-DD). Usa esta fecha actual de referencia cuando el usuario mencione "hoy", "ayer" o fechas relativas.

## REGLAS CRÍTICAS PARA REGISTRO Y EDICIÓN:
1. NUNCA inventes información. Si falta algún dato obligatorio para registrar un vuelo, pídeselo de forma clara al usuario.
2. Campos obligatorios para registrar un vuelo ('log_flight'):
   - aircraft_registration: Matrícula de la aeronave (debe coincidir con alguna en el hangar, ej: LV-S153).
   - date: Fecha (YYYY-MM-DD).
   - route: Ruta (ej: SADF - SADR).
   - duration: Horas de duración (ej: 1.5). Calcula o valida la duración SIEMPRE usando la conversión de minutos a decimales aeronáuticos que se detalla abajo.
   - takeoff: Hora despegue (HH:MM).
   - landing: Hora aterrizaje (HH:MM).
   - landings: Aterrizajes (número entero, por defecto pídelo o pon 1 si está implícito).
   - purpose: Finalidad del vuelo (debe ser un código corto como VP para Vuelo Privado, ENT para Entrenamiento, EXA para Examen, INST para Instrucción, etc. Si el piloto no lo indica, PREGÚNTALE siempre primero).
3. PASO DE CONFIRMACIÓN OBLIGATORIO: Cuando el usuario te pida registrar un nuevo vuelo (ya sea describiéndolo por texto o mediante una nota de voz), NO debes llamar a la función 'log_flight' inmediatamente.
   - Primero, debes redactar un resumen formateado de todos los datos que vas a registrar (aeronave, fecha, ruta, despegue/aterrizaje, duración calculada, aterrizajes y finalidad) y preguntarle explícitamente al usuario: "¿Está todo correcto? Por favor responde 'Ok', 'Sí' o 'Confirmar' para registrar el vuelo."
   - Únicamente si el usuario responde en el mensaje inmediatamente siguiente con una afirmación (como "ok", "sí", "confirmar", "dale", "correcto", "go"), debes proceder a llamar a la función 'log_flight' con los parámetros correspondientes.
   - Si el usuario te corrige algún dato, genera un nuevo resumen corregido y vuelve a pedir la confirmación.
4. Si el usuario te pide editar ('update_flight') o eliminar ('delete_flight') un vuelo, busca el UUID de ese vuelo en tu contexto de vuelos registrados (representado como [ID: uuid]) y úsalo para llamar a la función. Si no estás seguro de cuál vuelo se refiere, muéstrale los candidatos con sus datos y pídele confirmación.
5. Si falta cualquier dato requerido, detente y pregunta amablemente. No inventes nada.

## REGLAS PARA METAR, TAF, NOTAM Y DATOS DE AERÓDROMO:
1. Si el usuario te pregunta por el clima, reporte meteorológico, METAR o TAF de un aeropuerto (ej: "clima en SADF" o "METAR SAEZ"), debes obtenerlo usando la herramienta 'get_airport_weather'.
2. Al recibir la respuesta de la herramienta, debes decodificar/explicar el reporte METAR y TAF en español claro y conciso para el piloto, e incluir el reporte en texto crudo (raw) al final.
3. Si el usuario te pregunta por NOTAMs, pistas, frecuencias, datos técnicos del aeródromo, combustible, teléfonos, normas operativas, o si un aeródromo está ABIERTO o CERRADO (ej: "NOTAMs de SAAK", "frecuencias de SADF", "pistas de Ezeiza", "info MGI", "notam FDO"), debes usar la herramienta 'get_airport_info' que consulta el registro oficial MADHEL de la ANAC.
4. Al recibir los datos de 'get_airport_info', preséntale al piloto la ficha técnica en formato claro y organizado, incluyendo los NOTAMs si los hay.
5. CRÍTICO: La herramienta 'get_airport_info' acepta TANTO códigos OACI de 4 letras (SADF, SAEZ, SAAK) COMO indicadores locales ANAC de 3 letras (MGI, FDO, GEZ, AER, EZE, PAL, PTA). NUNCA inventes ni modifiques el código: si el usuario dice 'MGI' llama a la herramienta con 'MGI', si dice 'info FDO' usa 'FDO', si dice 'SADF' usa 'SADF'. No le agregues ni quites letras.


## CONVERSIÓN DE MINUTOS A DECIMALES AERONÁUTICOS:
Para determinar la duración de un vuelo o validarla, resta la hora de despegue de la de aterrizaje para obtener horas y minutos. Los minutos deben convertirse a decimales con precisión según la siguiente tabla exacta:
- 0 a 2 minutos: .0
- 3 a 8 minutos: .1
- 9 a 14 minutos: .2
- 15 a 20 minutos: .3
- 21 a 26 minutos: .4
- 27 a 33 minutos: .5
- 34 a 39 minutos: .6
- 40 a 45 minutos: .7
- 46 a 51 minutos: .8
- 52 a 57 minutos: .9
- 58 a 60 minutos: 1.0 (suma una hora al total)
Ejemplos: 
- Un vuelo de 1 hora y 15 minutos dura exactamente 1.3 horas (y no 1.25).
- Un vuelo de 45 minutos dura exactamente 0.7 horas.
Informa al usuario usando siempre esta tabla para ser consistente con la web.

## Datos de la bitácora del piloto:
${flightContext}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: systemPrompt,
      tools: [
        {
          functionDeclarations: [
            {
              name: "log_flight",
              description: "Registra un nuevo vuelo en la bitácora del piloto. Todos los campos requeridos son estrictamente obligatorios.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  aircraft_registration: { type: SchemaType.STRING, description: "Matrícula de la aeronave (ej. LV-S153)" },
                  date: { type: SchemaType.STRING, description: "Fecha del vuelo en formato YYYY-MM-DD" },
                  route: { type: SchemaType.STRING, description: "Ruta del vuelo (ej. SADF - SADR)" },
                  duration: { type: SchemaType.NUMBER, description: "Duración total del vuelo en horas decimales (ej. 1.2)" },
                  takeoff: { type: SchemaType.STRING, description: "Hora de despegue en formato de 24 hs (HH:MM)" },
                  landing: { type: SchemaType.STRING, description: "Hora de aterrizaje en formato de 24 hs (HH:MM)" },
                  landings: { type: SchemaType.INTEGER, description: "Cantidad de aterrizajes realizados" },
                  purpose: { type: SchemaType.STRING, description: "Código de finalidad del vuelo (ej. VP, ENT, EXA, INST, ACR, etc.)" },
                  pic_day_loc: { type: SchemaType.NUMBER, description: "Horas PIC Diurno Local (opcional)" },
                  pic_day_tra: { type: SchemaType.NUMBER, description: "Horas PIC Diurno Traslado (opcional)" },
                  pic_night_loc: { type: SchemaType.NUMBER, description: "Horas PIC Nocturno Local (opcional)" },
                  pic_night_tra: { type: SchemaType.NUMBER, description: "Horas PIC Nocturno Traslado (opcional)" },
                  sic_day_loc: { type: SchemaType.NUMBER, description: "Horas SIC Diurno Local (opcional)" },
                  sic_day_tra: { type: SchemaType.NUMBER, description: "Horas SIC Diurno Traslado (opcional)" },
                  sic_night_loc: { type: SchemaType.NUMBER, description: "Horas SIC Nocturno Local (opcional)" },
                  sic_night_tra: { type: SchemaType.NUMBER, description: "Horas SIC Nocturno Traslado (opcional)" },
                  imc_pil: { type: SchemaType.NUMBER, description: "Horas de vuelo en IMC Real Piloto (opcional)" },
                  imc_cop: { type: SchemaType.NUMBER, description: "Horas de vuelo en IMC Real Copiloto (opcional)" },
                  capota: { type: SchemaType.NUMBER, description: "Horas de vuelo bajo Capota/Instrumental Simulado (opcional)" },
                  sim_instructor: { type: SchemaType.NUMBER, description: "Horas en Simulador como Instructor (opcional)" },
                  sim_pil_en_inst: { type: SchemaType.NUMBER, description: "Horas en Simulador como Piloto en Instrucción (opcional)" },
                  discount_type: { type: SchemaType.STRING, description: "Tipo de descuento aplicado (opcional)" },
                  discount_amount: { type: SchemaType.NUMBER, description: "Monto del descuento (opcional)" }
                },
                required: ["aircraft_registration", "date", "route", "duration", "takeoff", "landing", "landings", "purpose"]
              }
            },
            {
              name: "update_flight",
              description: "Actualiza los datos de un vuelo existente.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  flight_id: { type: SchemaType.STRING, description: "El UUID del vuelo a actualizar" },
                  aircraft_registration: { type: SchemaType.STRING, description: "Nueva matrícula de aeronave (opcional)" },
                  date: { type: SchemaType.STRING, description: "Nueva fecha en formato YYYY-MM-DD (opcional)" },
                  route: { type: SchemaType.STRING, description: "Nueva ruta (opcional)" },
                  duration: { type: SchemaType.NUMBER, description: "Nueva duración en horas (opcional)" },
                  takeoff: { type: SchemaType.STRING, description: "Nueva hora de despegue (HH:MM) (opcional)" },
                  landing: { type: SchemaType.STRING, description: "Nueva hora de aterrizaje (HH:MM) (opcional)" },
                  landings: { type: SchemaType.INTEGER, description: "Nueva cantidad de aterrizajes (opcional)" },
                  purpose: { type: SchemaType.STRING, description: "Nueva finalidad (opcional)" },
                  pic_day_loc: { type: SchemaType.NUMBER, description: "Nuevas horas PIC Diurno Local (opcional)" },
                  pic_day_tra: { type: SchemaType.NUMBER, description: "Nuevas horas PIC Diurno Traslado (opcional)" },
                  pic_night_loc: { type: SchemaType.NUMBER, description: "Nuevas horas PIC Nocturno Local (opcional)" },
                  pic_night_tra: { type: SchemaType.NUMBER, description: "Nuevas horas PIC Nocturno Traslado (opcional)" },
                  sic_day_loc: { type: SchemaType.NUMBER, description: "Nuevas horas SIC Diurno Local (opcional)" },
                  sic_day_tra: { type: SchemaType.NUMBER, description: "Nuevas horas SIC Diurno Traslado (opcional)" },
                  sic_night_loc: { type: SchemaType.NUMBER, description: "Nuevas horas SIC Nocturno Local (opcional)" },
                  sic_night_tra: { type: SchemaType.NUMBER, description: "Nuevas horas SIC Nocturno Traslado (opcional)" },
                  imc_pil: { type: SchemaType.NUMBER, description: "Nuevas horas IMC Real Piloto (opcional)" },
                  imc_cop: { type: SchemaType.NUMBER, description: "Nuevas horas IMC Real Copiloto (opcional)" },
                  capota: { type: SchemaType.NUMBER, description: "Nuevas horas bajo Capota (opcional)" },
                  sim_instructor: { type: SchemaType.NUMBER, description: "Nuevas horas Simulador como Instructor (opcional)" },
                  sim_pil_en_inst: { type: SchemaType.NUMBER, description: "Nuevas horas Simulador como Piloto en Instrucción (opcional)" },
                  discount_type: { type: SchemaType.STRING, description: "Nuevo tipo de descuento (opcional)" },
                  discount_amount: { type: SchemaType.NUMBER, description: "Nuevo monto de descuento (opcional)" }
                },
                required: ["flight_id"]
              }
            },

            {
              name: "get_airport_weather",
              description: "Obtiene la información meteorológica en tiempo real (METAR y TAF) para un aeropuerto/aeródromo específico mediante su código OACI (ICAO).",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  icao_code: { type: SchemaType.STRING, description: "El código OACI de 4 letras del aeropuerto (ej. SADF, SADR, SAEZ)" }
                },
                required: ["icao_code"]
              }
            },
            {
              name: "get_airport_info",
              description: "Obtiene la ficha técnica completa de un aeródromo desde el registro oficial MADHEL de la ANAC Argentina: pistas y sus características, frecuencias de radio, ubicación respecto a la ciudad, combustible disponible, teléfonos de contacto, normas particulares y NOTAMs activos. Úsala cuando el usuario pregunte por datos técnicos de un aeródromo, NOTAMs, pistas, frecuencias, información del aeropuerto o si está CERRADO.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  icao_code: { type: SchemaType.STRING, description: "El código del aeródromo. Acepta TANTO códigos OACI de 4 letras (SADF, SAAK, SAEZ) COMO indicadores locales ANAC de 3 letras (MGI, FDO, GEZ, AER, EZE). NUNCA modifiques ni le agregues letras al código que te pasa el usuario: si dice MGI usa MGI, si dice SAAK usa SAAK." }
                },
                required: ["icao_code"]
              }
            }
          ]
        }
      ]
    });

    const formattedHistory = (history || []).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Gemini requires history to start with user
    const firstUserIndex = formattedHistory.findIndex((h: any) => h.role === "user");
    const cleanHistory = firstUserIndex !== -1 ? formattedHistory.slice(firstUserIndex) : [];

    const chat = model.startChat({
      history: cleanHistory,
    });

    const chatParts: any[] = [];
    if (audioBuffer) {
      chatParts.push({
        inlineData: {
          data: audioBuffer.toString("base64"),
          mimeType: audioMimeType
        }
      });
      chatParts.push({
        text: "Transcribe y procesa esta nota de voz. Si el piloto solicita registrar un vuelo, recuerda que primero debes presentar un resumen de confirmación antes de llamar a la herramienta 'log_flight'. Si no, responde su pregunta normalmente."
      });
    } else {
      chatParts.push({ text: messageText });
    }

    let result = await chat.sendMessage(chatParts);
    let functionCalls = result.response.functionCalls();

    while (functionCalls && functionCalls.length > 0) {
      const toolResults = [];

      for (const call of functionCalls) {
        const args: any = call.args;

        try {
          if (call.name === "log_flight") {
            const ac = aircraft.find(
              (a: any) => a.registration.trim().toUpperCase() === args.aircraft_registration.trim().toUpperCase()
            );
            if (!ac) {
              toolResults.push({
                name: call.name,
                response: { error: `La aeronave con matrícula '${args.aircraft_registration}' no está registrada en tu hangar.` }
              });
              continue;
            }

            const takeoff_dt = new Date(`${args.date}T${args.takeoff}:00Z`).toISOString().split('.')[0] + 'Z';
            const landing_dt = new Date(`${args.date}T${args.landing}:00Z`).toISOString().split('.')[0] + 'Z';
            const computedDuration = calculateFlightDuration(args.takeoff, args.landing);

            const response = await fetch(`${API_URL}/flights`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": userApiKey
              },
              body: JSON.stringify({
                aircraft_id: ac.id,
                date: args.date,
                route: args.route,
                landings: args.landings,
                duration: computedDuration,
                takeoff: takeoff_dt,
                landing: landing_dt,
                purpose: args.purpose,
                pic_day_loc: args.pic_day_loc || null,
                pic_day_tra: args.pic_day_tra || null,
                pic_night_loc: args.pic_night_loc || null,
                pic_night_tra: args.pic_night_tra || null,
                sic_day_loc: args.sic_day_loc || null,
                sic_day_tra: args.sic_day_tra || null,
                sic_night_loc: args.sic_night_loc || null,
                sic_night_tra: args.sic_night_tra || null,
                "IMC Pil": args.imc_pil || null,
                "IMC Cop": args.imc_cop || null,
                "Capota": args.capota || null,
                "Sim Instructor": args.sim_instructor || null,
                "Sim Pil en Inst": args.sim_pil_en_inst || null,
                discount_type: args.discount_type || null,
                discount_amount: args.discount_amount || null
              })
            });

            if (!response.ok) {
              const errData = await response.json();
              toolResults.push({
                name: call.name,
                response: { error: errData.detail || "Error al registrar el vuelo en el servidor" }
              });
            } else {
              const resData = await response.json();
              toolResults.push({
                name: call.name,
                response: { result: `Vuelo registrado exitosamente (duración calculada: ${computedDuration}h)`, flight: resData }
              });
            }

          } else if (call.name === "delete_flight") {
            toolResults.push({
              name: call.name,
              response: { error: "Por razones de seguridad, la eliminación de vuelos está deshabilitada desde WhatsApp. Por favor, hazlo desde la web oficial de Vector." }
            });

          } else if (call.name === "update_flight") {
            const flightResp = await fetch(`${API_URL}/flights/${args.flight_id}`, {
              headers: {
                "X-API-Key": userApiKey
              }
            });
            if (!flightResp.ok) {
              toolResults.push({
                name: call.name,
                response: { error: "Vuelo no encontrado" }
              });
              continue;
            }
            const existingFlight = await flightResp.json();

            const targetDate = args.date || existingFlight.date;
            let targetAircraftId = existingFlight.aircraft_id;

            if (args.aircraft_registration) {
              const ac = aircraft.find(
                (a: any) => a.registration.trim().toUpperCase() === args.aircraft_registration.trim().toUpperCase()
              );
              if (!ac) {
                toolResults.push({
                  name: call.name,
                  response: { error: `La aeronave con matrícula '${args.aircraft_registration}' no está registrada en tu hangar.` }
                });
                continue;
              }
              targetAircraftId = ac.id;
            }

            let takeoff_dt = existingFlight.takeoff;
            if (args.takeoff) {
              takeoff_dt = new Date(`${targetDate}T${args.takeoff}:00Z`).toISOString().split('.')[0] + 'Z';
            } else if (args.date && existingFlight.takeoff) {
              const originalTime = existingFlight.takeoff.split('T')[1].slice(0, 5);
              takeoff_dt = new Date(`${targetDate}T${originalTime}:00Z`).toISOString().split('.')[0] + 'Z';
            }

            let landing_dt = existingFlight.landing;
            if (args.landing) {
              landing_dt = new Date(`${targetDate}T${args.landing}:00Z`).toISOString().split('.')[0] + 'Z';
            } else if (args.date && existingFlight.landing) {
              const originalTime = existingFlight.landing.split('T')[1].slice(0, 5);
              landing_dt = new Date(`${targetDate}T${originalTime}:00Z`).toISOString().split('.')[0] + 'Z';
            }

            let takeoffTime = args.takeoff || existingFlight.takeoff?.split('T')[1]?.slice(0, 5);
            let landingTime = args.landing || existingFlight.landing?.split('T')[1]?.slice(0, 5);
            let duration = args.duration !== undefined ? args.duration : existingFlight.duration;
            if (args.takeoff || args.landing) {
              duration = calculateFlightDuration(takeoffTime, landingTime);
            }

            const payload = {
              aircraft_id: targetAircraftId,
              date: targetDate,
              route: args.route !== undefined ? args.route : existingFlight.route,
              landings: args.landings !== undefined ? args.landings : existingFlight.landings,
              duration: duration,
              takeoff: takeoff_dt,
              landing: landing_dt,
              purpose: args.purpose !== undefined ? args.purpose : existingFlight.purpose,
              pic_day_loc: args.pic_day_loc !== undefined ? args.pic_day_loc : existingFlight.pic_day_loc,
              pic_day_tra: args.pic_day_tra !== undefined ? args.pic_day_tra : existingFlight.pic_day_tra,
              pic_night_loc: args.pic_night_loc !== undefined ? args.pic_night_loc : existingFlight.pic_night_loc,
              pic_night_tra: args.pic_night_tra !== undefined ? args.pic_night_tra : existingFlight.pic_night_tra,
              sic_day_loc: args.sic_day_loc !== undefined ? args.sic_day_loc : existingFlight.sic_day_loc,
              sic_day_tra: args.sic_day_tra !== undefined ? args.sic_day_tra : existingFlight.sic_day_tra,
              sic_night_loc: args.sic_night_loc !== undefined ? args.sic_night_loc : existingFlight.sic_night_loc,
              sic_night_tra: args.sic_night_tra !== undefined ? args.sic_night_tra : existingFlight.sic_night_tra,
              "IMC Pil": args.imc_pil !== undefined ? args.imc_pil : existingFlight["IMC Pil"],
              "IMC Cop": args.imc_cop !== undefined ? args.imc_cop : existingFlight["IMC Cop"],
              "Capota": args.capota !== undefined ? args.capota : existingFlight["Capota"],
              "Sim Instructor": args.sim_instructor !== undefined ? args.sim_instructor : existingFlight["Sim Instructor"],
              "Sim Pil en Inst": args.sim_pil_en_inst !== undefined ? args.sim_pil_en_inst : existingFlight["Sim Pil en Inst"],
              discount_type: args.discount_type !== undefined ? args.discount_type : existingFlight.discount_type,
              discount_amount: args.discount_amount !== undefined ? args.discount_amount : existingFlight.discount_amount
            };

            const response = await fetch(`${API_URL}/flights/${args.flight_id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": userApiKey
              },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              const errData = await response.json();
              toolResults.push({
                name: call.name,
                response: { error: errData.detail || "Error al actualizar el vuelo" }
              });
            } else {
              const resData = await response.json();
              toolResults.push({
                name: call.name,
                response: { result: `Vuelo actualizado exitosamente (duración calculada: ${duration}h)`, flight: resData }
              });
            }
          } else if (call.name === "get_airport_weather") {
            const icao = args.icao_code?.trim().toUpperCase();
            if (!icao) {
              toolResults.push({
                name: call.name,
                response: { error: "Código OACI no provisto." }
              });
              continue;
            }
            try {
              const metarRes = await fetch(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=raw`, {
                headers: { "User-Agent": "Vector-Flight-Log-App" }
              });
              const metar = metarRes.ok ? await metarRes.text() : "No disponible";

              const tafRes = await fetch(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=raw`, {
                headers: { "User-Agent": "Vector-Flight-Log-App" }
              });
              const taf = tafRes.ok ? await tafRes.text() : "No disponible";

              toolResults.push({
                name: call.name,
                response: { metar: metar.trim(), taf: taf.trim() }
              });
            } catch (err: any) {
              toolResults.push({
                name: call.name,
                response: { error: `Error consultando clima: ${(err as any).message}` }
              });
            }
          } else if (call.name === "get_airport_info") {
            const icao = args.icao_code?.trim().toUpperCase();
            if (!icao) {
              toolResults.push({
                name: call.name,
                response: { error: "Código OACI no provisto." }
              });
              continue;
            }
            try {
              const info = await getAirportInfoHelper(icao);
              toolResults.push({
                name: call.name,
                response: {
                  madhel: info.madhel,
                  notams: info.notams
                }
              });
            } catch (err: any) {
              toolResults.push({
                name: call.name,
                response: { error: `Error consultando MADHEL: ${err.message}` }
              });
            }
          }
        } catch (err: any) {
          toolResults.push({
            name: call.name,
            response: { error: err.message || "Error al procesar la herramienta" }
          });
        }
      }

      const toolParts = toolResults.map(tr => ({
        functionResponse: {
          name: tr.name,
          response: tr.response
        }
      }));

      result = await chat.sendMessage(toolParts);
      functionCalls = result.response.functionCalls();
    }

    const replyText = result.response.text();

    const userMessageContent = messageText.trim() || "[Nota de voz]";
    const updatedHistory = [
      ...history,
      { role: "user", content: userMessageContent },
      { role: "assistant", content: replyText }
    ];

    await fetch(`${API_URL}/whatsapp/chat-history?phone=${fromNumber}&secret=${secret}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: updatedHistory })
    });

    await sendWhatsAppMessage(fromNumber, formatForWhatsApp(replyText), payloadPhoneNumberId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("WhatsApp webhook execution error:", err);
    if (fromNumber) {
      const isQuotaError = err.message?.includes("quota") || err.message?.includes("429");
      const userMessage = isQuotaError
        ? "Hola 🛩️ He recibido tu mensaje, pero el Copiloto IA ha alcanzado temporalmente su límite de cuota diaria. Por favor, intenta de nuevo en unos minutos."
        : "Hola 🛩️ Ocurrió un error al procesar tu solicitud con el Copiloto IA. Por favor, intenta de nuevo en un momento.";
      try {
        await sendWhatsAppMessage(fromNumber, userMessage, payloadPhoneNumberId);
      } catch (sendErr) {
        console.error("Failed to send fallback WhatsApp error message:", sendErr);
      }
    }
    // Return 200 to prevent retry loops
    return NextResponse.json({ success: false, error: err.message || "Internal error" });
  }
}
