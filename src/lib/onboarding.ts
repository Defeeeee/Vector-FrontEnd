import { Profile } from "@/types";

/**
 * ¿Qué le falta al piloto para estar operativo?
 *
 * Vive en una función y no inline en cada componente porque **hay dos lugares que
 * opinan sobre lo mismo**: el overlay del alta, que bloquea hasta que haya
 * licencia, y el checklist del tablero, que recoge lo que el overlay dejó
 * salteado. Con la condición escrita a mano en los dos, el día que se agregue un
 * requisito uno va a decir que sí y el otro que no.
 *
 * Es además lo único de este plan con test automático posible: el harness de
 * vitest corre en `node` y sólo toma `src/**\/*.test.ts`, así que nada que
 * renderice React entra.
 */

/** El centinela que deja el backend al auto-crear un perfil. */
const LICENCIA_SIN_CARGAR = "-";

export interface EstadoOnboarding {
  licencia: boolean;
  cma: boolean;
  aeronave: boolean;
  vuelo: boolean;
  /** Nada que mostrar: el piloto está operativo. */
  completo: boolean;
  pendientes: number;
}

export function estadoOnboarding(input: {
  profile: Profile | null;
  tieneCma: boolean;
  aeronaves: number;
  vuelos: number;
}): EstadoOnboarding {
  const licencia = tieneLicencia(input.profile);
  const pasos = {
    licencia,
    cma: input.tieneCma,
    aeronave: input.aeronaves > 0,
    vuelo: input.vuelos > 0,
  };

  const pendientes = Object.values(pasos).filter((v) => !v).length;

  return { ...pasos, completo: pendientes === 0, pendientes };
}

/**
 * `license_type` es `NOT NULL` y el backend la crea con `"-"`, así que "vacío" y
 * "sin cargar" son dos cosas distintas y las dos cuentan como falta.
 */
export function tieneLicencia(profile: Profile | null): boolean {
  const tipo = profile?.license_type?.trim();
  return !!tipo && tipo !== LICENCIA_SIN_CARGAR;
}
