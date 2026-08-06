/**
 * Las defensas del copiloto: lo que evita que un mensaje de WhatsApp escriba
 * mal en la bitácora de un piloto.
 *
 * Viven acá y no dentro del route handler para que se puedan testear sin
 * levantar Next ni hablar con Gemini. Son todas funciones puras salvo
 * `writeProposedFlight`, que hace un único POST.
 */
import { canonicalRoute } from "./madhel-reference";

export interface ChatEntry {
  role: string;
  content?: string;
  /** WhatsApp message id, stored so a retry can be recognised across restarts. */
  id?: string;
  /** A flight the pilot has been shown and has not confirmed yet. */
  pending_flight?: Record<string, any>;
  /** ms epoch, for expiring a stale proposal. */
  at?: number;
}

export const alreadyHandled = (history: ChatEntry[], messageId: string): boolean =>
  Boolean(messageId) && history.some((h) => h.id === messageId);

/** How long a flight waiting for confirmation stays valid. */
export const PENDING_FLIGHT_TTL_MS = 30 * 60 * 1000;

export function pendingFlight(history: ChatEntry[]): Record<string, any> | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (!entry?.pending_flight) continue;
    if (entry.at && Date.now() - entry.at > PENDING_FLIGHT_TTL_MS) return null;
    return entry.pending_flight;
  }
  return null;
}

const AFFIRMATIONS = new Set([
  "ok", "oka", "okay", "si", "sí", "sip", "dale", "confirmar", "confirmo", "correcto",
  "va", "vale", "listo", "go", "perfecto", "exacto", "afirmativo", "yes", "y",
]);

/** Deliberately strict: anything that is not a clear yes cancels the proposal. */
export function isAffirmation(text: string): boolean {
  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
  if (!clean) return false;
  const words = clean.split(/\s+/);
  return words.length <= 2 && words.every((w) => AFFIRMATIONS.has(w));
}

/**
 * The ANAC buckets a flight's time is split into, and the ceiling they share.
 *
 * IMC, capota and simulator deliberately are not summed: they overlap flight
 * time rather than partition it — the same rule `openingTotals` follows in
 * src/lib/summary.ts.
 */
export const PIC_SIC_KEYS = [
  "pic_day_loc", "pic_day_tra", "pic_night_loc", "pic_night_tra",
  "sic_day_loc", "sic_day_tra", "sic_night_loc", "sic_night_tra",
] as const;

/**
 * Rejects a breakdown that claims more hours than the flight lasted.
 *
 * The web form cannot produce one — `TimeAllocator` caps every field against
 * what is left. The copilot has no such floor: the numbers come out of a
 * language model, so they get checked here instead of being written to a
 * regulatory record on trust.
 */
export function breakdownError(args: Record<string, any>, duration: number): string | null {
  const assigned = PIC_SIC_KEYS.reduce((sum, k) => sum + (Number(args[k]) || 0), 0);
  // A hundredth of an hour of slack, for decimals that do not divide cleanly.
  if (assigned > duration + 0.01) {
    return `El desglose asigna ${assigned.toFixed(1)} h a PIC/SIC pero el vuelo dura ${duration.toFixed(1)} h.`;
  }
  return null;
}

/** Lo que el piloto ve antes de confirmar. Se arma en código, no en el modelo:
 *  tiene que describir exactamente lo que se va a escribir. */
export function proposalSummary(p: Record<string, any>, aircraftLabel: string, logbookLabel?: string): string {
  const lines = [
    "✈️ *Vuelo a registrar*",
    "",
    `*Aeronave:* ${aircraftLabel}`,
    `*Fecha:* ${p.date}`,
    `*Ruta:* ${p.route}`,
    `*Despegue:* ${p.takeoff}  ·  *Aterrizaje:* ${p.landing}`,
    `*Duración:* ${p.duration} h`,
    `*Aterrizajes:* ${p.landings}`,
    `*Finalidad:* ${p.purpose}`,
  ];

  if (logbookLabel) lines.push(`*Libro:* ${logbookLabel}`);

  const desglose = PIC_SIC_KEYS.filter((k) => Number(p[k]) > 0).map((k) => `${k}: ${p[k]}`);
  if (desglose.length) lines.push(`*Desglose:* ${desglose.join(" · ")}`);
  else lines.push("*Desglose:* sin asignar");

  lines.push("", "Respondé *SÍ* para registrarlo, o corregime lo que esté mal.");
  return lines.join("\n");
}

/**
 * Escribe el vuelo que el piloto confirmó.
 *
 * La ruta se canonicaliza acá y no antes: es el último punto por el que pasa
 * antes de la base, igual que hace el formulario web. Sin esto el copiloto
 * puede guardar "gez" mientras la web guarda "SRDR", y el mismo aeródromo
 * aparece dos veces en el historial del piloto.
 */
export async function writeProposedFlight(
  p: Record<string, any>,
  apiKey: string,
  apiUrl: string
): Promise<{ ok: boolean; message: string }> {
  const takeoffDt = new Date(`${p.date}T${p.takeoff}:00Z`).toISOString().split(".")[0] + "Z";
  const landingDt = new Date(`${p.date}T${p.landing}:00Z`).toISOString().split(".")[0] + "Z";

  const body: Record<string, any> = {
    aircraft_id: p.aircraft_id,
    date: p.date,
    route: canonicalRoute(p.route),
    landings: p.landings,
    duration: p.duration,
    takeoff: takeoffDt,
    landing: landingDt,
    purpose: p.purpose,
    "IMC Pil": p.imc_pil || null,
    "IMC Cop": p.imc_cop || null,
    Capota: p.capota || null,
    "Sim Instructor": p.sim_instructor || null,
    "Sim Pil en Inst": p.sim_pil_en_inst || null,
    discount_type: p.discount_type || null,
    discount_amount: p.discount_amount || null,
  };
  for (const k of PIC_SIC_KEYS) body[k] = p[k] || null;
  if (p.logbook_id) body.logbook_id = p.logbook_id;

  const res = await fetch(`${apiUrl}/flights`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, message: `❌ No se pudo registrar el vuelo: ${err.detail || "error del servidor"}` };
  }
  return { ok: true, message: `✅ Vuelo registrado: ${body.route} · ${p.duration} h · ${p.date}` };
}
