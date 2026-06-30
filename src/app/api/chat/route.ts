import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { apiFetch } from "@/lib/api";
import { Flight, Aircraft, Profile } from "@/types";
import { calculateFlightDuration } from "@/lib/utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function buildFlightContext(
  flights: Flight[],
  aircraft: Aircraft[],
  profile: Profile | null,
  packs: any[],
  transactions: any[],
  balance: number,
  session: any
): string {
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
      return `- [ID: ${f.id}] ${label}: ${f.route.toUpperCase()} | ${acStr} | ${f.duration}h | ${f.landings} aterrizajes${times}${cols ? " | " + cols : ""}`;
    })
    .join("\n");

  const acSummary = Array.from(hoursPerAircraft.entries())
    .map(([k, h]) => `${k}: ${h.toFixed(1)}h`)
    .join("; ");

  const txLines = transactions.slice(0, 5).map(t => {
    return `- [${t.type.toUpperCase()}] ${new Date(t.created_at).toLocaleDateString("es-AR")}: $${t.amount} | ${t.description || ""}`;
  }).join("\n");

  const packLines = packs.map(p => {
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
Aeronaves usadas: ${aircraft.map(a => `${a.registration} (${a.icao}, ${a.type})`).join("; ")}
Horas por aeronave: ${acSummary}
Rutas más frecuentes: ${topRoutes}
Vuelo más largo: ${flights.length > 0 ? Math.max(...flights.map(f => f.duration)).toFixed(1) + "h" : "0h"}
Promedio por vuelo: ${flights.length > 0 ? (totalHours / flights.length).toFixed(1) + "h" : "0h"}

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

    // Fetch pilot data in a consolidated call to dashboard
    const dashboardRes = await apiFetch("/dashboard");
    if (!dashboardRes.ok) {
      return NextResponse.json({ error: "No se pudieron obtener los datos de la bitácora" }, { status: 500 });
    }

    const data = await dashboardRes.json();
    const flights: Flight[] = data.flights || [];
    const aircraft: Aircraft[] = data.aircraft || [];
    const profile: Profile | null = data.profile || null;
    const packs = data.packs || [];
    const transactions = data.transactions || [];
    const balance = data.balance || 0;
    const session = data.session || { active: false };

    const todayStr = new Date().toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const [d, m, y] = todayStr.split("/");
    const currentLocalDate = `${y}-${m}-${d}`;

    const flightContext = buildFlightContext(
      flights,
      aircraft,
      profile,
      packs,
      transactions,
      balance,
      session
    );

    const systemPrompt = `Eres un asistente de aviación inteligente integrado en Vector, una aplicación de bitácora de vuelo.
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
3. Si el usuario te pide editar ('update_flight') o eliminar ('delete_flight') un vuelo, busca el UUID de ese vuelo en tu contexto de vuelos registrados (representado como [ID: uuid]) y úsalo para llamar a la función. Si no estás seguro de cuál vuelo se refiere, muéstrale los candidatos con sus datos y pídele confirmación.
4. Si falta cualquier dato requerido, detente y pregunta amablemente. No inventes nada.

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
      model: "gemini-2.5-flash",
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
                  pic_night_tra: { type: SchemaType.NUMBER, description: "Horas PIC Nocturno Traslado (opcional)" }
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
                  pic_night_tra: { type: SchemaType.NUMBER, description: "Nuevas horas PIC Nocturno Traslado (opcional)" }
                },
                required: ["flight_id"]
              }
            },
            {
              name: "delete_flight",
              description: "Elimina un vuelo existente por su UUID.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  flight_id: { type: SchemaType.STRING, description: "UUID del vuelo a eliminar" }
                },
                required: ["flight_id"]
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

    // Gemini requires the history to start with a 'user' message.
    const firstUserIndex = formattedHistory.findIndex((h: any) => h.role === "user");
    const cleanHistory = firstUserIndex !== -1 ? formattedHistory.slice(firstUserIndex) : [];

    const chat = model.startChat({
      history: cleanHistory,
    });

    let result = await chat.sendMessage(message);
    let functionCalls = result.response.functionCalls();

    // Loop to handle potential multiple sequential function calls (multi-turn tool use)
    while (functionCalls && functionCalls.length > 0) {
      const toolResults = [];

      for (const call of functionCalls) {
        const args: any = call.args;

        try {
          if (call.name === "log_flight") {
            const ac = aircraft.find(
              a => a.registration.trim().toUpperCase() === args.aircraft_registration.trim().toUpperCase()
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

            const response = await apiFetch("/flights", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
                pic_night_tra: args.pic_night_tra || null
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
            const response = await apiFetch(`/flights/${args.flight_id}`, {
              method: "DELETE"
            });

            if (!response.ok) {
              const errData = await response.json();
              toolResults.push({
                name: call.name,
                response: { error: errData.detail || "Error al eliminar el vuelo del servidor" }
              });
            } else {
              toolResults.push({
                name: call.name,
                response: { result: "Vuelo eliminado exitosamente" }
              });
            }

          } else if (call.name === "update_flight") {
            const flightResp = await apiFetch(`/flights/${args.flight_id}`);
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
                a => a.registration.trim().toUpperCase() === args.aircraft_registration.trim().toUpperCase()
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
              pic_night_tra: args.pic_night_tra !== undefined ? args.pic_night_tra : existingFlight.pic_night_tra
            };

            const response = await apiFetch(`/flights/${args.flight_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              const errData = await response.json();
              toolResults.push({
                name: call.name,
                response: { error: errData.detail || "Error al actualizar el vuelo en el servidor" }
              });
            } else {
              const resData = await response.json();
              toolResults.push({
                name: call.name,
                response: { result: `Vuelo actualizado exitosamente (duración calculada: ${duration}h)`, flight: resData }
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

      // Convert tool results to Parts for the generative model
      const toolParts = toolResults.map(tr => ({
        functionResponse: {
          name: tr.name,
          response: tr.response
        }
      }));

      result = await chat.sendMessage(toolParts);
      functionCalls = result.response.functionCalls();
    }

    const text = result.response.text();
    return NextResponse.json({ reply: text });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
