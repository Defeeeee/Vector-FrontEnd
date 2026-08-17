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

/**
 * Cada paso acepta `null` = "no se pudo leer", y **los cuatro, no sólo el CMA**.
 *
 * La primera versión de esto sólo contemplaba que fallara la consulta de
 * documentos, porque ése fue el bug reportado. El 2026-08-17 se vio la otra
 * mitad: una request de `/dashboard` en la que siete de las ocho consultas no
 * salieron, y el checklist le mostró a un piloto con licencia, 6 aeronaves y 41
 * vuelos cargados **tres de los cuatro pasos sin tildar**. El bug nunca fue "el
 * CMA": es "una lista vacía se lee como una afirmación", y hay cuatro listas.
 */
export function estadoOnboarding(input: {
  profile: Profile | null;
  /** `false` si no se pudo leer el perfil: sin él no se sabe si hay licencia. */
  perfilDisponible?: boolean;
  /** `null` si no se pudieron leer los documentos. Ver `PasoOnboarding`. */
  tieneCma: PasoOnboarding;
  /** `null` si no se pudieron leer las aeronaves. */
  aeronaves: number | null;
  /** `null` si no se pudieron leer los vuelos. */
  vuelos: number | null;
}): EstadoOnboarding {
  const perfilDisponible = input.perfilDisponible ?? true;
  const pasos = {
    licencia: perfilDisponible ? tieneLicencia(input.profile) : null,
    cma: input.tieneCma,
    aeronave: input.aeronaves === null ? null : input.aeronaves > 0,
    vuelo: input.vuelos === null ? null : input.vuelos > 0,
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
