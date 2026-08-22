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
    version: "2.16.0",
    fecha: "2026-08-22",
    titulo: "El tracker ahora mide la PCA y la HVI juntas",
    novedades: [
      {
        icono: "grafico",
        titulo: "Las dos licencias en la misma card, porque casi nadie hace la PCA sola",
        texto:
          "El camino normal acá es sacar la comercial y la habilitación por instrumentos como un solo tramo. El tracker mostraba sólo 61.620, y con los seis diales en verde podías estar a treinta horas de instrumentos del examen que en realidad vas a rendir. Ahora suma el requisito de la HVI: 40 horas de instrumentos, de las cuales hasta 20 pueden ser en simulador.",
        href: "/dashboard",
        cta: "Ver el tracker",
      },
      {
        icono: "reloj",
        titulo: "Y el dial de instrumentos dejó de decir que no volaste nada",
        texto:
          "Cuando lo que te frenaba eran las horas de instrumentos, la proyección contestaba siempre \"no volaste nada de eso en los últimos 3 meses\" aunque las tuvieras cargadas. Ya proyecta con tu ritmo real.",
      },
    ],
  },
  {
    version: "2.15.0",
    fecha: "2026-08-22",
    titulo: "Vector sin señal, y los simuladores en el libro",
    novedades: [
      {
        icono: "nube",
        titulo: "La app abre en la plataforma aunque no haya señal",
        texto:
          "Instalala desde el navegador del celular y las pantallas que ya visitaste con conexión siguen abriendo sin ella, con un cartel que dice de cuándo es la foto que estás viendo. El planificador resuelve aeródromos, radioayudas y fixes con un catálogo que viaja adentro de la app: la ruta que armás sin señal da los mismos números que con señal.",
        href: "/dashboard/planificador",
        cta: "Abrir el planificador",
      },
      {
        icono: "reloj",
        titulo: "Ahora todo dato meteorológico dice de cuándo es",
        texto:
          "Debajo de cada METAR está la hora en que se observó, sacada del propio texto del reporte. Y pasadas las dos horas deja de mostrarse: un METAR viejo no es meteorología, es un texto viejo, y no alimenta ningún veredicto de ruta.",
      },
      {
        icono: "avion",
        titulo: "Los simuladores se cargan como en el libro de papel",
        texto:
          "Marcá el equipo como simulador en el hangar y la sesión se anota igual que un vuelo —fecha, horarios, ruta— pero las horas van enteras a la columna de instrucción terrestre y no suman tiempo total. La ruta acepta escribir LOCAL, que no es un aeródromo, y no se cuenta ni como aterrizaje ni como destino visitado.",
        href: "/dashboard/settings",
        cta: "Marcar un simulador",
      },
    ],
  },
  {
    version: "2.14.0",
    fecha: "2026-08-19",
    titulo: "Los 51 aeródromos controlados, con sus cartas",
    novedades: [
      {
        icono: "nube",
        titulo: "Frecuencias, pistas y combustible de toda la red controlada",
        texto:
          "Antes teníamos datos del AIP de ocho aeródromos; ahora de los 51 que ANAC publica con ficha, Morón incluido. Salen del documento oficial y cada número está verificado contra el PDF en las dos direcciones: nada que no esté publicado, y nada publicado que falte.",
        href: "/dashboard/airports",
        cta: "Buscar un aeródromo",
      },
      {
        icono: "compartir",
        titulo: "Las cartas oficiales, en la ficha",
        texto:
          "El plano de aeródromo y la carta de aproximación de cada uno, con su edición y desde cuándo rige, sin salir a buscarlas al sitio de ANAC. Son 246 documentos.",
        href: "/dashboard/airports",
        cta: "Ver las cartas",
      },
      {
        icono: "reloj",
        titulo: "Y corregimos el largo de nueve pistas",
        texto:
          "Cruzando el AIP con la base que usábamos aparecieron nueve pistas mal medidas. Morón figuraba con 2850 m y mide 2303; San Fernando con 1801 y mide 1690. Donde ANAC publica la medida, ahora manda ANAC.",
      },
    ],
  },
  {
    version: "2.13.0",
    fecha: "2026-08-19",
    titulo: "La ruta se reordena, y los puntos entran donde quieras",
    novedades: [
      {
        icono: "brujula",
        titulo: "Meté un punto en el medio sin borrar nada",
        texto:
          "Entre cada par de puntos ahora hay un \"Punto acá\": el punto nuevo entra ahí y no al final. Antes, para agregar una escala en el medio había que borrar todo lo que venía después y volver a escribirlo.",
        href: "/dashboard/planificador",
        cta: "Armar una ruta",
      },
      {
        icono: "reloj",
        titulo: "Y se puede subir y bajar",
        texto:
          "Cada punto tiene flechas para moverlo de lugar. Si la ruta tiene una aerovía, se mueve entera con su punto de salida — no se puede partir al medio ni dejarla sin el punto por donde entrás.",
      },
    ],
  },
  {
    version: "2.12.1",
    fecha: "2026-08-19",
    titulo: "Rutas por aerovía, eligiendo en vez de escribiendo",
    novedades: [
      {
        icono: "brujula",
        titulo: "\"Ir por aerovía\", abajo de cada punto",
        texto:
          "Debajo de cada punto de la ruta aparece un botón que te ofrece las aerovías que pasan por ahí y hasta dónde llega cada una. Elegís las dos cosas de una lista: no hay que saberse ninguna de memoria ni tener la carta al lado. La aerovía queda como una franja entre los dos puntos, y si cambiás el destino se recalcula sola en vez de dejarte once campos sueltos para borrar a mano.",
        href: "/dashboard/planificador",
        cta: "Probar una aerovía",
      },
      {
        icono: "lupa",
        titulo: "220 aerovías, y las que no verificamos no aparecen",
        texto:
          "Salen del ENR 3 del AIP y cada secuencia se contrasta contra el ENR 4.4: si a una le falta un punto, no la publicamos. Una aerovía incompleta daría una travesía más corta que la real y con pinta de válida. De la aerovía se usa sólo por dónde pasa: los niveles y la clase de espacio aéreo hay que consultarlos aparte.",
      },
    ],
  },
  {
    version: "2.11.0",
    fecha: "2026-08-19",
    titulo: "Los puntos de aerovía, en el planificador",
    novedades: [
      {
        icono: "brujula",
        titulo: "Los 1018 puntos significativos del AIP",
        texto:
          "Escribí DORVO, AKNOS o cualquiera de los cinco letras que canta el control y entra en la ruta como un punto más, con su tramo, su rumbo y su tiempo. Te muestra a qué aerovías pertenece y de qué edición del AIP salió — se enmienda cada 28 días.",
        href: "/dashboard/planificador",
        cta: "Planificar con un fix",
      },
    ],
  },
  {
    version: "2.10.1",
    fecha: "2026-08-19",
    titulo: "Las frecuencias de los aeródromos controlados estaban mal",
    novedades: [
      {
        icono: "nube",
        titulo: "Corregimos las frecuencias, las pistas y el combustible",
        texto:
          "De los ocho aeródromos controlados que mostrábamos —Aeroparque, Ezeiza, San Fernando, El Palomar, Córdoba, Rosario, Mar del Plata y Bariloche— casi todos los datos estaban equivocados: la torre de San Fernando figuraba en 118.45 y son 119.00 y 120.05, El Palomar tenía la pista 17/35 anotada como 16/34, y Ezeiza aparecía con AVGAS cuando sólo hay JET A-1. Ahora salen del AIP de ANAC, con la fecha de vigencia a la vista. Si planificaste con esos números, revisalos.",
        href: "/dashboard/airports",
        cta: "Ver un aeródromo",
      },
      {
        icono: "lupa",
        titulo: "Y ahora se puede verificar",
        texto:
          "Cada frecuencia y cada medida que ves de esos aeródromos tiene que aparecer en el PDF oficial de ANAC, y hay una prueba automática que lo comprueba en cada cambio. Los teléfonos de esos ocho se sacaron: no teníamos de dónde confirmarlos.",
      },
    ],
  },
  {
    version: "2.10.0",
    fecha: "2026-08-19",
    titulo: "Un punto de la ruta ya no tiene que ser un aeródromo",
    novedades: [
      {
        icono: "brujula",
        titulo: "Puntos por radial y distancia",
        texto:
          "Escribí BAR/045/25 y el planificador lo toma como punto: 25 NM en el radial 045 del VOR de Bariloche. Usa la variación con la que está alineada la estación, que no es la de hoy ni la del aeródromo, y te dice qué frecuencia sintonizar.",
        href: "/dashboard/planificador",
        cta: "Probar un radial",
      },
      {
        icono: "lupa",
        titulo: "Tus propios puntos visuales",
        texto:
          "El pueblo, el cruce de rutas, la laguna: si tenés la coordenada, escribila como S34.68/W58.64 y entra en la ruta como un punto más, con su tramo, su rumbo y su tiempo.",
        href: "/dashboard/planificador",
        cta: "Planificar un vuelo",
      },
      {
        icono: "avion",
        titulo: "Las radioayudas del país",
        texto:
          "96 estaciones —VOR, VOR-DME y los NDB que no se confunden con otro— con su frecuencia y su posición, para poder apoyar la ruta en ellas.",
      },
    ],
  },
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
