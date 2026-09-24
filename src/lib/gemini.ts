/**
 * Qué modelo de Gemini usa Vector, y qué hace cuando Google está saturado.
 *
 * El copiloto (web y WhatsApp) y la importación del libro en PDF usan el mismo par:
 * un Flash-Lite, rápido y barato, y un Flash de respaldo. El 2026-09-23 el copiloto
 * contestó "503 Service Unavailable ... high demand" con `gemini-3.1-flash-lite`,
 * que seguía siendo estable: no era un modelo dado de baja sino capacidad de Google.
 * Cambiar de nombre no alcanza —cualquier modelo puede saturarse—, así que además
 * hay respaldo.
 *
 * Los nombres salen de https://ai.google.dev/gemini-api/docs/models (consultado el
 * 2026-09-23): los dos soportan function calling, salida con JSON schema y PDF, que
 * es lo que usan las tres rutas.
 */
import type {
  Content,
  ContentListUnion,
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
  PartListUnion,
} from "@google/genai";

export const MODELO_GEMINI = "gemini-3.5-flash-lite";
export const MODELO_GEMINI_RESPALDO = "gemini-3.8-flash";

/**
 * ¿El error es de capacidad de Google (vale probar con otro modelo) y no nuestro?
 *
 * 503 es "sobrecargado", 500 un error interno suyo, y 429 el límite de pedidos, que
 * Google cuenta por modelo: el de respaldo tiene su propio cupo. Un 400 (pedido mal
 * armado) o un 403 (clave) fallarían igual con cualquier modelo.
 */
export function esSaturacion(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number") return status === 429 || status === 500 || status === 503;
  const mensaje = err instanceof Error ? err.message : String(err ?? "");
  return /\[(429|500|503)\b|overloaded|high demand|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(mensaje);
}

/**
 * Lo que las rutas le pasan al cliente: sólo `models` y `chats`, para que el test
 * pueda poner un Gemini de mentira sin red.
 */
type ClienteGemini = { models: Pick<GoogleGenAI["models"], "generateContent">; chats: Pick<GoogleGenAI["chats"], "create"> };

/**
 * Un chat que, si un mensaje falla por saturación, lo reenvía al modelo de respaldo
 * con la misma historia.
 *
 * Se cambia **por mensaje** y no reintentando el turno entero: entre un mensaje y el
 * siguiente el copiloto puede haber ejecutado una herramienta —registrar un vuelo—, y
 * repetir el turno la repetiría. El SDK sólo agrega a la historia los mensajes que
 * salieron bien, así que la historia que se copia es exactamente la de antes del fallo.
 */
export function chatConRespaldo(
  ai: ClienteGemini,
  config: GenerateContentConfig,
  history: Content[] = [],
) {
  let chat = ai.chats.create({ model: MODELO_GEMINI, config, history });
  let enRespaldo = false;
  return {
    get modelo() {
      return enRespaldo ? MODELO_GEMINI_RESPALDO : MODELO_GEMINI;
    },
    async sendMessage(message: PartListUnion): Promise<GenerateContentResponse> {
      try {
        return await chat.sendMessage({ message });
      } catch (err) {
        if (enRespaldo || !esSaturacion(err)) throw err;
        const anterior = chat.getHistory();
        console.warn(`Gemini: ${MODELO_GEMINI} no respondió (${(err as Error).message}); sigo con ${MODELO_GEMINI_RESPALDO}.`);
        chat = ai.chats.create({ model: MODELO_GEMINI_RESPALDO, config, history: anterior });
        enRespaldo = true;
        return await chat.sendMessage({ message });
      }
    },
  };
}

/** Un pedido suelto (sin chat), con el mismo respaldo. */
export async function generarConRespaldo(
  ai: ClienteGemini,
  config: GenerateContentConfig,
  contents: ContentListUnion,
): Promise<GenerateContentResponse> {
  try {
    return await ai.models.generateContent({ model: MODELO_GEMINI, config, contents });
  } catch (err) {
    if (!esSaturacion(err)) throw err;
    console.warn(`Gemini: ${MODELO_GEMINI} no respondió (${(err as Error).message}); sigo con ${MODELO_GEMINI_RESPALDO}.`);
    return await ai.models.generateContent({ model: MODELO_GEMINI_RESPALDO, config, contents });
  }
}
