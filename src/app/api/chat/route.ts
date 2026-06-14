import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiFetch } from "@/lib/api";
import { Flight, Aircraft, Profile } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function buildFlightContext(flights: Flight[], aircraft: Aircraft[], profile: Profile | null): string {
  const aircraftMap = new Map(aircraft.map(a => [a.id, a]));
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const totalHours = flights.reduce((s, f) => s + f.duration, 0);
  const totalLandings = flights.reduce((s, f) => s + f.landings, 0);

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
    .map(f => {
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
      return `- ${label}: ${f.route.toUpperCase()} | ${acStr} | ${f.duration}h | ${f.landings} aterrizajes${times}${cols ? " | " + cols : ""}`;
    })
    .join("\n");

  const acSummary = Array.from(hoursPerAircraft.entries())
    .map(([k, h]) => `${k}: ${h.toFixed(1)}h`)
    .join("; ");

  return `
## Perfil del piloto
Nombre: ${profile ? `${profile.first_name} ${profile.last_name}` : "Desconocido"}
Licencia: ${profile?.license_type || "No especificada"}
Vencimiento CMA: ${profile?.cma_expiry || "No especificado"}

## Resumen estadístico
Total vuelos: ${flights.length}
Total horas: ${totalHours.toFixed(1)}h
Total aterrizajes: ${totalLandings}
Aeronaves usadas: ${aircraft.map(a => `${a.registration} (${a.icao}, ${a.type})`).join("; ")}
Horas por aeronave: ${acSummary}
Rutas más frecuentes: ${topRoutes}
Vuelo más largo: ${Math.max(...flights.map(f => f.duration)).toFixed(1)}h
Promedio por vuelo: ${(totalHours / flights.length).toFixed(1)}h

## Registro completo de vuelos (${flights.length} vuelos)
${flightLines}
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key de Gemini no configurada" }, { status: 500 });
    }

    // Fetch pilot data
    const [flightsRes, aircraftRes, profilesRes] = await Promise.all([
      apiFetch("/flights"),
      apiFetch("/aircraft"),
      apiFetch("/profiles"),
    ]);

    const flights: Flight[] = flightsRes.ok ? await flightsRes.json() : [];
    const aircraft: Aircraft[] = aircraftRes.ok ? await aircraftRes.json() : [];
    const profiles: Profile[] = profilesRes.ok ? await profilesRes.json() : [];
    const profile = profiles[0] || null;

    const flightContext = buildFlightContext(flights, aircraft, profile);

    const systemPrompt = `Eres un asistente de aviación inteligente integrado en Vector, una aplicación de bitácora de vuelo. 
Tu rol es ayudar al piloto a analizar su historial de vuelos, estadísticas, y responder preguntas sobre su experiencia aérea.

Responde siempre en español, de forma concisa y clara. Usa emojis cuando sean útiles.
Cuando hagas cálculos o referencias a vuelos específicos, sé preciso con los datos.
Si el piloto pregunta algo que no está en sus datos, dilo honestamente.
No inventes datos ni vuelos que no estén en el registro.

## Datos de la bitácora del piloto:
${flightContext}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: (history || []).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
