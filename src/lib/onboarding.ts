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

/**
 * Un paso: hecho, pendiente, o **sin saber**.
 *
 * `null` es el tercer caso y existe porque el dashboard puede quedarse sin la
 * respuesta de una sección. Un paso que no se pudo verificar no se muestra: ni
 * tildado, que sería mentir, ni pendiente, que sería pedirle al piloto que cargue
 * algo que probablemente ya tiene.
 */
export type PasoOnboarding = boolean | null;

export interface EstadoOnboarding {
  licencia: PasoOnboarding;
  cma: PasoOnboarding;
  aeronave: PasoOnboarding;
  vuelo: PasoOnboarding;
  /** Nada que mostrar: el piloto está operativo. */
  completo: boolean;
  pendientes: number;
}

export function estadoOnboarding(input: {
  profile: Profile | null;
  /** `null` si no se pudieron leer los documentos. Ver `PasoOnboarding`. */
  tieneCma: PasoOnboarding;
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

  // `=== false` y no `!v`: `null` también es falsy y contarlo haría que la
  // tarjeta apareciera por un paso que ni se va a dibujar.
  const pendientes = Object.values(pasos).filter((v) => v === false).length;

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
