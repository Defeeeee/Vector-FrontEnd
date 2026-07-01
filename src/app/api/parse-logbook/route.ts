import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API Key no configurada" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo PDF" }, { status: 400 });
    }

    // Convert file to base64 buffer for inline Gemini ingestion
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          description: "Lista de vuelos extraídos del libro de vuelo PDF",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              date: { type: SchemaType.STRING, description: "Fecha del vuelo en formato YYYY-MM-DD (ej: 2026-06-30)" },
              aircraft_registration: { type: SchemaType.STRING, description: "Matrícula de la aeronave (ej. LV-S153, N12345)" },
              route: { type: SchemaType.STRING, description: "Ruta del vuelo (ej. SADF - SAAK o SADF/SAAK)" },
              duration: { type: SchemaType.NUMBER, description: "Duración en horas decimales (ej. 1.2, 0.8, 1.5)" },
              takeoff: { type: SchemaType.STRING, description: "Hora de despegue local en formato HH:MM (ej. 14:30)" },
              landing: { type: SchemaType.STRING, description: "Hora de aterrizaje local en formato HH:MM (ej. 15:50)" },
              landings: { type: SchemaType.INTEGER, description: "Cantidad de aterrizajes. Por defecto poner 1 si no se especifica" },
              purpose: { type: SchemaType.STRING, description: "Código de finalidad (ej. VP, ENT, INST, EXA). Por defecto 'VP'" },
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
              sim_pil_en_inst: { type: SchemaType.NUMBER, description: "Horas en Simulador como Piloto en Instrucción (opcional)" }
            },
            required: ["date", "aircraft_registration", "route", "duration", "takeoff", "landing", "landings", "purpose"]
          }
        }
      }
    });

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

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      },
      prompt
    ]);

    const text = result.response.text();
    const parsedFlights = JSON.parse(text);

    return NextResponse.json({ flights: parsedFlights });
  } catch (err: any) {
    console.error("parse-logbook API error:", err);
    return NextResponse.json({ error: err.message || "Error al procesar el libro de vuelo" }, { status: 500 });
  }
}
