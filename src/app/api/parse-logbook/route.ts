import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, type GenerateContentConfig } from "@google/genai";
import { generarConRespaldo } from "@/lib/gemini";
import { getSessionToken } from "@/actions/auth";
import { apiFetch } from "@/lib/api";

/**
 * Un libro de muchas hojas tarda en leerse bastante más que una respuesta del copiloto:
 * el tope por modelo de `lib/gemini.ts` lo cortaría a mitad de camino.
 */
const ESPERA_PDF_MS = 120_000;

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/** Un libro escaneado entero entra holgado; más que esto no es un libro de vuelo. */
const PDF_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Importar el libro de papel: el PDF va a Gemini, que devuelve los vuelos.
 *
 * **Pide sesión antes de tocar nada.** Hasta el 2026-09-23 no la pedía: `/api/*` no
 * pasa por el proxy, así que cualquiera podía mandar PDFs y gastar la cuota de Gemini
 * del proyecto. La cookie sola no alcanza —el proxy no verifica firmas—, así que se le
 * pregunta al backend quién es.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await getSessionToken())) {
      return NextResponse.json({ error: "Tu sesión venció. Volvé a entrar." }, { status: 401 });
    }
    const quien = await apiFetch("/profiles", { cache: "no-store" });
    if (quien.status === 401) {
      return NextResponse.json({ error: "Tu sesión venció. Volvé a entrar." }, { status: 401 });
    }
    if (!quien.ok) {
      return NextResponse.json({ error: "No se pudo verificar tu sesión. Probá de nuevo." }, { status: 503 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API Key no configurada" }, { status: 500 });
    }

    // Antes de leer el cuerpo: un archivo enorme ni se baja a memoria.
    if (Number(req.headers.get("content-length") || 0) > PDF_MAX_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: "El PDF pesa demasiado (máximo 15 MB)." }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No se subió ningún archivo PDF" }, { status: 400 });
    }
    if (file.size > PDF_MAX_BYTES) {
      return NextResponse.json({ error: "El PDF pesa demasiado (máximo 15 MB)." }, { status: 413 });
    }

    // Convert file to base64 buffer for inline Gemini ingestion
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // El modelo y su respaldo viven en lib/gemini.ts.
    const parametrosModelo: GenerateContentConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: "Lista de vuelos extraídos del libro de vuelo PDF",
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Fecha del vuelo en formato YYYY-MM-DD (ej: 2026-06-30)" },
            aircraft_registration: { type: Type.STRING, description: "Matrícula de la aeronave (ej. LV-S153, N12345)" },
            route: { type: Type.STRING, description: "Ruta del vuelo (ej. SADF - SAAK o SADF/SAAK)" },
            duration: { type: Type.NUMBER, description: "Duración en horas decimales (ej. 1.2, 0.8, 1.5)" },
            takeoff: { type: Type.STRING, description: "Hora de despegue local en formato HH:MM (ej. 14:30)" },
            landing: { type: Type.STRING, description: "Hora de aterrizaje local en formato HH:MM (ej. 15:50)" },
            landings: { type: Type.INTEGER, description: "Cantidad de aterrizajes. Por defecto poner 1 si no se especifica" },
            purpose: { type: Type.STRING, description: "Código de finalidad (ej. VP, ENT, INST, EXA). Por defecto 'VP'" },
            pic_day_loc: { type: Type.NUMBER, description: "Horas PIC Diurno Local (opcional)" },
            pic_day_tra: { type: Type.NUMBER, description: "Horas PIC Diurno Traslado (opcional)" },
            pic_night_loc: { type: Type.NUMBER, description: "Horas PIC Nocturno Local (opcional)" },
            pic_night_tra: { type: Type.NUMBER, description: "Horas PIC Nocturno Traslado (opcional)" },
            sic_day_loc: { type: Type.NUMBER, description: "Horas SIC Diurno Local (opcional)" },
            sic_day_tra: { type: Type.NUMBER, description: "Horas SIC Diurno Traslado (opcional)" },
            sic_night_loc: { type: Type.NUMBER, description: "Horas SIC Nocturno Local (opcional)" },
            sic_night_tra: { type: Type.NUMBER, description: "Horas SIC Nocturno Traslado (opcional)" },
            imc_pil: { type: Type.NUMBER, description: "Horas de vuelo en IMC Real Piloto (opcional)" },
            imc_cop: { type: Type.NUMBER, description: "Horas de vuelo en IMC Real Copiloto (opcional)" },
            capota: { type: Type.NUMBER, description: "Horas de vuelo bajo Capota/Instrumental Simulado (opcional)" },
            sim_instructor: { type: Type.NUMBER, description: "Horas en Simulador como Instructor (opcional)" },
            sim_pil_en_inst: { type: Type.NUMBER, description: "Horas en Simulador como Piloto en Instrucción (opcional)" }
          },
          required: ["date", "aircraft_registration", "route", "duration", "takeoff", "landing", "landings", "purpose"]
        }
      }
    };

    const prompt = `Analiza detalladamente este libro de vuelo (PDF de logbook de piloto).
Extrae todos los vuelos que encuentres. Para cada vuelo, identifica y extrae:
- Fecha (date) formateada a YYYY-MM-DD.
- Matrícula de la aeronave (aircraft_registration).
- Ruta (route), por ejemplo 'SADF - SAAK'.
- Duración total en horas decimales (duration).
- Horas de despegue (takeoff) y aterrizaje (landing) en formato HH:MM.
- Cantidad de aterrizajes (landings). Si no se detalla, por defecto asigna 1.
- Finalidad (purpose). Usa códigos comunes: 'VP' para vuelo privado/placer, 'INST' para instrucción/alumno, 'ENT' para entrenamiento, 'EXA' para examen. Si no está claro, asigna 'VP'.
- Tiempos de desglose de vuelo (PIC, SIC, nocturnos, traslados, IMC, etc.) si están presentes y asocialos a su columna correspondiente en horas decimales.

Asegúrate de procesar todas las páginas del PDF.`;

    const result = await generarConRespaldo(genAI, parametrosModelo, [
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      },
      prompt
    ], ESPERA_PDF_MS);

    const text = (result.text ?? "");
    const parsedFlights = JSON.parse(text);

    return NextResponse.json({ flights: parsedFlights });
  } catch (err: any) {
    console.error("parse-logbook API error:", err);
    return NextResponse.json({ error: err.message || "Error al procesar el libro de vuelo" }, { status: 500 });
  }
}
