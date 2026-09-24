import { describe, expect, it, vi } from "vitest";
import { chatConRespaldo, esSaturacion, generarConRespaldo, MODELO_GEMINI, MODELO_GEMINI_RESPALDO } from "./gemini";

/** El error que tira el SDK (`ApiError`): el JSON de Google como mensaje, y `status`. */
function errorDeGoogle(status: number, texto = "") {
  return Object.assign(new Error(`{"error":{"code":${status},"message":"${texto}"}}`), { status });
}

/**
 * Un Gemini de mentira: cada modelo contesta según `respuestas[modelo]`, en orden, y
 * como el SDK, la historia sólo crece con los mensajes que salieron bien.
 */
function geminiFalso(respuestas: Record<string, Array<Error | string>>) {
  const llamadas: Array<{ modelo: string; pedido: unknown; history: unknown[] }> = [];
  const ai = {
    chats: {
      create: vi.fn(({ model, history = [] }: { model: string; history?: unknown[] }) => {
        const historia = [...history];
        return {
          getHistory: () => historia,
          sendMessage: async ({ message }: { message: unknown }) => {
            llamadas.push({ modelo: model, pedido: message, history: [...historia] });
            const r = respuestas[model].shift();
            if (r instanceof Error) throw r;
            historia.push({ role: "user", parts: message }, { role: "model", parts: r });
            return { text: r };
          },
        };
      }),
    },
    models: {
      generateContent: vi.fn(async ({ model, contents }: { model: string; contents: unknown }) => {
        llamadas.push({ modelo: model, pedido: contents, history: [] });
        const r = respuestas[model].shift();
        if (r instanceof Error) throw r;
        return { text: r };
      }),
    },
  };
  return { genAI: ai as never, llamadas };
}

describe("esSaturacion", () => {
  it("toma 503, 500 y 429 como capacidad de Google", () => {
    expect(esSaturacion(errorDeGoogle(503, "Service Unavailable"))).toBe(true);
    expect(esSaturacion(errorDeGoogle(500, "Internal Server Error"))).toBe(true);
    expect(esSaturacion(errorDeGoogle(429, "Too Many Requests"))).toBe(true);
  });

  it("no cambia de modelo por un pedido mal armado o una clave inválida", () => {
    expect(esSaturacion(errorDeGoogle(400, "Bad Request"))).toBe(false);
    expect(esSaturacion(errorDeGoogle(403, "Forbidden"))).toBe(false);
    expect(esSaturacion(new Error("Unexpected token in JSON"))).toBe(false);
  });

  it("reconoce el 503 por el texto aunque el error no traiga status", () => {
    expect(esSaturacion(new Error("[503 Service Unavailable] This model is currently experiencing high demand."))).toBe(true);
  });
});

describe("chatConRespaldo", () => {
  it("usa el modelo principal mientras contesta", async () => {
    const { genAI, llamadas } = geminiFalso({ [MODELO_GEMINI]: ["hola"], [MODELO_GEMINI_RESPALDO]: [] });
    const chat = chatConRespaldo(genAI, {});
    const r = await chat.sendMessage("¿puedo volar?");
    expect(r.text).toBe("hola");
    expect(llamadas.map((l) => l.modelo)).toEqual([MODELO_GEMINI]);
  });

  it("si un mensaje falla por saturación, lo reenvía al respaldo con la historia de antes", async () => {
    const { genAI, llamadas } = geminiFalso({
      [MODELO_GEMINI]: ["propongo el vuelo", errorDeGoogle(503, "Service Unavailable")],
      [MODELO_GEMINI_RESPALDO]: ["vuelo registrado", "de nada"],
    });
    const chat = chatConRespaldo(genAI, {}, [{ role: "user", parts: [{ text: "antes" }] }]);
    await chat.sendMessage("cargá el vuelo");
    // El resultado de una herramienta: es lo único que se reenvía, no el turno.
    const r = await chat.sendMessage([{ text: "resultado de log_flight" }]);
    expect(r.text).toBe("vuelo registrado");
    expect(chat.modelo).toBe(MODELO_GEMINI_RESPALDO);
    const reenvio = llamadas[2];
    expect(reenvio.modelo).toBe(MODELO_GEMINI_RESPALDO);
    expect(reenvio.pedido).toEqual([{ text: "resultado de log_flight" }]);
    // La historia llega con lo que salió bien, y sin el mensaje que falló.
    expect(reenvio.history).toHaveLength(3);
    // Y el resto del turno sigue en el respaldo.
    await chat.sendMessage("gracias");
    expect(llamadas[3].modelo).toBe(MODELO_GEMINI_RESPALDO);
  });

  it("un error que no es de capacidad se propaga sin cambiar de modelo", async () => {
    const { genAI, llamadas } = geminiFalso({ [MODELO_GEMINI]: [errorDeGoogle(400, "Bad Request")], [MODELO_GEMINI_RESPALDO]: ["no"] });
    await expect(chatConRespaldo(genAI, {}).sendMessage("x")).rejects.toThrow("400");
    expect(llamadas.map((l) => l.modelo)).toEqual([MODELO_GEMINI]);
  });

  it("si el respaldo también está saturado, el error llega a la ruta", async () => {
    const { genAI } = geminiFalso({ [MODELO_GEMINI]: [errorDeGoogle(503)], [MODELO_GEMINI_RESPALDO]: [errorDeGoogle(503)] });
    await expect(chatConRespaldo(genAI, {}).sendMessage("x")).rejects.toThrow("503");
  });
});

describe("generarConRespaldo", () => {
  it("cae al respaldo si el principal está saturado", async () => {
    const { genAI, llamadas } = geminiFalso({ [MODELO_GEMINI]: [errorDeGoogle(503)], [MODELO_GEMINI_RESPALDO]: ["[]"] });
    const r = await generarConRespaldo(genAI, {}, ["pdf", "prompt"]);
    expect(r.text).toBe("[]");
    expect(llamadas.map((l) => l.modelo)).toEqual([MODELO_GEMINI, MODELO_GEMINI_RESPALDO]);
  });
});
