import { salidaUtc } from "./plan-de-vuelo";
import { localDesdeUtc, type FormularioPlan } from "./formulario-plan";

/**
 * La demora (DLA) de un plan de vuelo presentado.
 *
 * AIP ENR 1.10, punto 7 (AIRAC AMDT 2/2025):
 * - 7.1: con más de **una hora** de demora respecto de la hora prevista de inicio de rodaje
 *   (30 minutos si el vuelo es controlado o IFR), "el plan de vuelo deberá enmendarse o
 *   presentarse un nuevo plan de vuelo cancelando el antiguo".
 * - 7.2: "Las demoras deberán ser notificadas a la oficina ARO/AIS con no menos de 30
 *   minutos antes de la EOBT, pasado ese tiempo deberá presentar un nuevo plan de vuelo."
 * - 7.3: "La cantidad máxima de presentaciones de DLA en la Oficina ARO/AIS es de tres (3)
 *   formularios por vuelo."
 * - El formulario es el del Apéndice 4 (`plan-de-vuelo-dla.png`): casillas 7, 13 con la
 *   nueva EOBT, 16 con duración y alternativa, 18, y nombre, licencia y firma.
 *
 * Puro: la hora actual entra como parámetro.
 */

export const MAXIMO_DEMORAS = 3;
/** Minutos antes de la EOBT hasta los que se puede avisar una demora (7.2). */
export const ANTICIPACION_MINUTOS = 30;

export interface Demora {
  /** La nueva EOBT, en UTC (`1930`). */
  eobt: string;
  /** La fecha de salida en UTC (`2026-10-20`). */
  dof: string;
  creada?: string;
}

function msUtc(dof: string, eobt: string): number {
  return Date.parse(`${dof}T${eobt.slice(0, 2)}:${eobt.slice(2)}:00Z`);
}

/**
 * La EOBT vigente del plan: la de la última demora, o la del plan.
 */
export function eobtVigente(f: FormularioPlan, demoras: Demora[]): { dof: string; eobt: string } | null {
  const ultima = demoras[demoras.length - 1];
  if (ultima) return { dof: ultima.dof, eobt: ultima.eobt };
  return f.dofUtc && f.eobtUtc ? { dof: f.dofUtc, eobt: f.eobtUtc } : null;
}

/**
 * La demora a partir de la nueva hora en hora argentina. Se toma el mismo día local de la
 * salida vigente; **si la hora nueva es anterior, es al día siguiente** (salía 23:00 y
 * ahora sale 00:30).
 */
export function demoraDesdeHoraLocal(f: FormularioPlan, demoras: Demora[], horaLocal: string): Demora | null {
  const vigente = eobtVigente(f, demoras);
  if (!vigente) return null;
  const local = localDesdeUtc(vigente.dof, vigente.eobt);
  if (!local) return null;
  let utc = salidaUtc(local.fecha, horaLocal);
  if (!utc) return null;
  const toDof = (aammdd: string) => `20${aammdd.slice(0, 2)}-${aammdd.slice(2, 4)}-${aammdd.slice(4, 6)}`;
  if (msUtc(toDof(utc.dof), utc.hora) <= msUtc(vigente.dof, vigente.eobt)) {
    const manana = new Date(Date.parse(`${local.fecha}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    utc = salidaUtc(manana, horaLocal);
    if (!utc) return null;
  }
  return { eobt: utc.hora, dof: toDof(utc.dof) };
}

/**
 * Si esta demora se puede avisar: el máximo de tres (error) y los 30 minutos antes de la
 * EOBT vigente (aviso: pasado ese tiempo, la AIP pide un plan nuevo).
 */
export function revisarDemora(
  f: FormularioPlan,
  demoras: Demora[],
  ahoraIso: string
): { error: string | null; aviso: string | null } {
  if (demoras.length >= MAXIMO_DEMORAS) {
    return { error: "Ya avisaste tres demoras: es el máximo por vuelo (AIP ENR 1.10, 7.3). Presentá un plan nuevo.", aviso: null };
  }
  const vigente = eobtVigente(f, demoras);
  if (!vigente) return { error: "El plan no tiene fecha y hora de salida.", aviso: null };
  const limite = msUtc(vigente.dof, vigente.eobt) - ANTICIPACION_MINUTOS * 60_000;
  if (Date.parse(ahoraIso) > limite) {
    return {
      error: null,
      aviso: "Faltan menos de 30 minutos para la salida (o ya pasó): la AIP pide presentar un plan nuevo en vez de una demora (ENR 1.10, 7.2).",
    };
  }
  return { error: null, aviso: null };
}

/** La fecha de una demora como va en DOF/: `AAMMDD`. */
export function dofDeDemora(d: Demora): string {
  return `${d.dof.slice(2, 4)}${d.dof.slice(5, 7)}${d.dof.slice(8, 10)}`;
}
