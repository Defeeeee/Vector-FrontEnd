/**
 * Las novedades de Vector, como datos.
 *
 * ## Por qué esto existe
 *
 * Antes vivían adentro de `ChangelogNotice.tsx`: el número de versión escrito a mano en
 * una constante, y el contenido en JSX. Dos consecuencias, las dos malas.
 *
 * La primera es que había **dos fuentes de verdad** para la versión —`package.json` y el
 * componente— y sólo coincidían por disciplina.
 *
 * La segunda es peor y ya había pasado: **la tarjeta quedó diez features atrasada.**
 * Anunciaba "¿Podés volar hoy?" y "Tus propias métricas" mientras se habían publicado
 * los costos por vuelo, el calendario, la tarjeta compartible, los vencimientos
 * variables, el planificador de navegación y el arreglo de la sesión. Un piloto que
 * entraba veía las novedades de tres semanas antes. Agregar una feature no puede
 * significar acordarse de editar un componente.
 *
 * Como esto es un `.ts` puro, **se testea** — que es la única forma de que no vuelva a
 * mentir. Ver `changelog.test.ts`: la versión más nueva de acá tiene que ser la de
 * `package.json`, y cada `href` tiene que apuntar a una pantalla que exista de verdad.
 *
 * ## Qué va acá y qué no
 *
 * Sólo lo que el piloto **ve**. La higiene interna —tests, refactors, timeouts, la
 * columna de variación magnética— importa muchísimo y no es una novedad que alguien
 * quiera leer en su dashboard. Eso vive en `AGENTS.md`.
 */

/**
 * Los íconos se nombran, no se importan.
 *
 * Este archivo corre en los tests con `environment: "node"`, así que no puede traer
 * componentes de React. El componente mapea el nombre a un ícono de lucide con un
 * `Record<NombreIcono, …>`, y **TypeScript obliga a que estén todos**: si alguien
 * agrega un nombre acá y se olvida del ícono, no compila.
 */
export type NombreIcono =
  | "brujula"
  | "avion"
  | "nube"
  | "llave"
  | "billetera"
  | "calendario"
  | "compartir"
  | "reloj"
  | "lupa"
  | "grafico";

export interface Novedad {
  icono: NombreIcono;
  titulo: string;
  /** Una o dos frases. Qué cambió para el piloto, no cómo se implementó. */
  texto: string;
  /** Ruta interna. El test comprueba que la pantalla exista. */
  href?: string;
  /** Texto del link. Sin `href` no se usa. */
  cta?: string;
}

export interface VersionPublicada {
  /** Sin la "v": "2.8.0". */
  version: string;
  /** ISO, `YYYY-MM-DD`. */
  fecha: string;
  titulo: string;
  novedades: Novedad[];
}

/**
 * De la más nueva a la más vieja. El orden lo verifica un test — la tarjeta muestra
 * `CHANGELOG[0]` y nada más, así que una entrada fuera de orden anunciaría lo viejo.
 */
export const CHANGELOG: VersionPublicada[] = [
  {
    version: "2.9.0",
    fecha: "2026-08-19",
    titulo: "Todo el preflight en una sola pantalla",
    novedades: [
      {
        icono: "brujula",
        titulo: "Planificador de vuelo",
        texto:
          "Cargá la ruta y te arma la planilla de navegación mientras escribís: rumbos, tiempos y combustible por tramo, con el viento del METAR de salida y la variación magnética de tu aeródromo. Se imprime y se comparte con el link.",
        href: "/dashboard/planificador",
        cta: "Planificar un vuelo",
      },
      {
        icono: "avion",
        titulo: "Performance de tus aeronaves",
        texto:
          "Cargá una vez la velocidad de crucero, el consumo y el tanque de cada avión, y el planificador deja de estimar para calcular con tus números.",
        href: "/dashboard/settings",
        cta: "Completar el Hangar",
      },
      {
        icono: "nube",
        titulo: "Briefing y planificación en la misma pantalla",
        texto:
          "El planificador ahora trae también el METAR, el TAF y los NOTAM de cada punto, el viento cruzado sobre la pista y la densidad de altitud. Y podés tomar el viento del modelo en altura en vez del de superficie, que a 10.000 ft puede cambiar el tiempo de un tramo diez minutos.",
        href: "/dashboard/planificador",
        cta: "Ver el briefing",
      },
      {
        icono: "llave",
        titulo: "La sesión dejó de caerse",
        texto:
          "Vector te echaba más o menos cada hora, sin aviso y sin motivo aparente. Ahora se renueva sola y aguanta treinta días.",
      },
    ],
  },
  {
    version: "2.7.0",
    fecha: "2026-08-10",
    titulo: "¡Tu bitácora Vector sigue sumando herramientas!",
    novedades: [
      {
        icono: "brujula",
        titulo: "¿Podés volar hoy?",
        texto:
          "Vector junta tu certificado médico, tu repaso de vuelo y tu experiencia reciente, y te dice qué podés hacer — citando la sección de la RAAC 61.",
        href: "/dashboard",
        cta: "Ver mi estado",
      },
      {
        icono: "grafico",
        titulo: "Tus propias métricas",
        texto:
          "Armá los números que querés seguir —horas en una aeronave, aterrizajes en un aeródromo, lo que sea— y aparecen en tu dashboard.",
        href: "/dashboard/settings",
        cta: "Crear una métrica",
      },
    ],
  },
];

/** La versión que se está mostrando. Tiene que coincidir con `package.json`. */
export const VERSION_ACTUAL = CHANGELOG[0].version;

/**
 * Cuántas novedades entran en la tarjeta del dashboard.
 *
 * Cuatro es lo que se lee de un vistazo sin empujar el resto del dashboard fuera de
 * pantalla. El resto vive en `/dashboard/novedades`, que existe justamente para no
 * tener que elegir entre contar todo y no molestar.
 */
export const NOVEDADES_EN_TARJETA = 4;

/** La clave de descarte, por versión: al publicar una nueva, la tarjeta vuelve sola. */
export function claveDescarte(version: string): string {
  return `vector_dismissed_changelog_v${version}`;
}
