/**
 * Las secciones de la barra y qué pantallas entran en cada una.
 *
 * La barra llegó a tener **nueve destinos**, porque cada pantalla nueva se agregaba al
 * final para no mover las de adelante. En el teléfono cinco entraban y cuatro quedaban
 * en la hoja "Más", y un alumno nuevo tenía que aprenderse nueve íconos para cargar un
 * vuelo. Ahora son cuatro secciones, y las pantallas que antes eran destinos sueltos
 * pasan a ser pestañas de la sección a la que pertenecen.
 *
 * **Las URLs no cambian.** Hay links a estas pantallas en los mails del briefing, en las
 * novedades, en el cache del service worker y en el smoke. Agrupar es una decisión de
 * navegación, no de rutas: sólo cambia qué ícono se ilumina y qué pestañas se ven.
 *
 * **El orden de los primeros íconos se respeta.** Inicio, Bitácora, Balance y
 * Planificador ya ocupaban los cuatro primeros lugares; "Preparar vuelo" hereda el
 * ícono y el lugar del Planificador. La memoria muscular de quien ya usaba la app sigue
 * apuntando a lo mismo, y sólo desaparecen los cinco íconos que sobraban.
 *
 * Es un `.ts` puro y sin íconos —el componente los asigna por clave— para poder
 * testearlo en `environment: "node"`, igual que `changelog.ts`.
 */

export type ClaveSeccion = "inicio" | "bitacora" | "balance" | "preparar";

export interface Pestana {
  href: string;
  label: string;
}

export interface Seccion {
  clave: ClaveSeccion;
  label: string;
  /**
   * Las pantallas de la sección, en el orden en que se muestran. La primera es
   * adonde lleva el ícono de la barra. Con una sola, la sección no tiene pestañas.
   */
  pestanas: Pestana[];
}

/** Lleva el contador de hallazgos abiertos, en la barra y en su pestaña. */
export const AUDITORIA_HREF = "/dashboard/audit";

export const SECCIONES: Seccion[] = [
  {
    clave: "inicio",
    label: "Inicio",
    pestanas: [{ href: "/dashboard", label: "Inicio" }],
  },
  {
    clave: "bitacora",
    label: "Bitácora",
    pestanas: [
      { href: "/dashboard/history", label: "Vuelos" },
      { href: "/dashboard/summary", label: "Resumen" },
      // Muestra lo programado y lo ya volado: es la bitácora vista por fecha.
      { href: "/dashboard/calendario", label: "Calendario" },
      { href: AUDITORIA_HREF, label: "Auditoría" },
    ],
  },
  {
    clave: "balance",
    label: "Balance",
    pestanas: [{ href: "/dashboard/balance", label: "Balance" }],
  },
  {
    clave: "preparar",
    label: "Preparar vuelo",
    pestanas: [
      { href: "/dashboard/planificador", label: "Planificador" },
      { href: "/dashboard/airports", label: "Aeropuertos" },
      { href: "/dashboard/clima", label: "Clima" },
      { href: "/dashboard/tools", label: "Herramientas" },
    ],
  },
];

/** Adónde lleva el ícono de la sección: su primera pestaña. */
export function hrefDeSeccion(seccion: Seccion): string {
  return seccion.pestanas[0].href;
}

/**
 * Si `pathname` es esa pestaña o una pantalla que cuelga de ella.
 *
 * `/dashboard` es la excepción: es el prefijo de todas las pantallas de la app, así
 * que con prefijo cualquier ruta sería "Inicio". Ésa sólo cuenta exacta.
 */
export function esPestanaActiva(pestana: Pestana, pathname: string): boolean {
  if (pathname === pestana.href) return true;
  return pestana.href !== "/dashboard" && pathname.startsWith(`${pestana.href}/`);
}

/**
 * La sección a la que pertenece una pantalla, o `null` si no pertenece a ninguna.
 *
 * `null` es un caso normal y no un error: el Hangar vive en el avatar, Novedades se
 * abre desde su tarjeta, y "Registrar vuelo" es una acción, no un lugar. En esas
 * pantallas no se ilumina ningún ícono y no hay pestañas.
 */
export function seccionDe(pathname: string): Seccion | null {
  return SECCIONES.find((s) => s.pestanas.some((p) => esPestanaActiva(p, pathname))) ?? null;
}
