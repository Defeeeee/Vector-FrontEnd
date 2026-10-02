/**
 * El mail de novedades: lo que cambió en Vector, para todas las cuentas.
 *
 * Federico lo pidió el 2026-10-02: había 14 cuentas y sólo la suya con vuelos, y los
 * pilotos que entraron en septiembre vieron una app distinta de la de hoy. Cuenta lo
 * nuevo en bloques cortos, cada uno con su link, y termina con un botón que depende de
 * la persona: cargar el primer vuelo, o abrir la bitácora si ya tiene.
 *
 * **Cada cosa que promete se verificó contra el código**, como la landing:
 * - el audio al copiloto (`api/webhooks/whatsapp`) y el número (`lib/copiloto.ts`);
 * - el importador del libro en PDF (`/dashboard/log-flight/import`);
 * - "Alumno piloto" y el camino a la PPA (`lib/licencias.ts`, `lib/ppa-progress.ts`);
 * - el resumen del mes (`lib/resumen-mensual.ts`);
 * - la base en São Paulo (migrada el 2026-09-24; la red pasó de ~150 ms a ~1 ms);
 * - instalable y sin señal (`app/manifest.ts`, `sw/sw.ts`).
 * No dice "gratis" ni "oficial": no son decisiones tomadas.
 *
 * Es un mail que no pidieron, así que lleva la baja propia (`lib/baja-mail.ts`, tipo
 * "novedades") en el pie y en la cabecera `List-Unsubscribe`. Cada tanda tiene una
 * `clave`; el backend no le manda dos veces la misma a nadie (`services/mails.py`).
 */
import { bloque, boton, etiqueta, parrafo, plantillaMail, type Icono } from "./mail-plantilla";

export interface DatosNovedades {
  nombre: string | null;
  /** Si ya cargó algún vuelo: cambia el botón del final. */
  tieneVuelos: boolean;
  /**
   * Alumno piloto (`esAlumno`): no lleva libro, así que el importador del PDF lo rebota
   * y no se le ofrece; y el camino a la PPA ya es el suyo.
   */
  alumno?: boolean;
  appUrl: string;
  /** El chat con el copiloto, si está configurado. */
  linkCopiloto: string | null;
  /** La página de la baja de novedades. */
  linkBaja: string;
}

export interface MensajeNovedades {
  asunto: string;
  texto: string;
  html: string;
}

interface Novedad {
  icono: Icono;
  titulo: string;
  texto: string;
  link?: { texto: string; url: string };
}

export function novedades(d: DatosNovedades): Novedad[] {
  const hangar = `${d.appUrl}/dashboard/settings`;
  const lista: Novedad[] = [
    {
      icono: "mic",
      titulo: "Cargá un vuelo con un audio",
      texto: "Mandale un audio al copiloto por WhatsApp contando el vuelo. Te muestra el resumen y lo carga cuando confirmás.",
      link: d.linkCopiloto ? { texto: "Abrir WhatsApp", url: d.linkCopiloto } : { texto: "Dejar mi número en el Hangar", url: hangar },
    },
  ];
  if (!d.alumno) {
    lista.push({
      icono: "file-text",
      titulo: "Traé tu libro de papel",
      texto: "Subí las hojas escaneadas en PDF y Vector carga los vuelos. Vos los revisás antes de guardarlos.",
      link: { texto: "Importar el PDF", url: `${d.appUrl}/dashboard/log-flight/import` },
    });
  }
  lista.push(
    d.alumno
      ? {
          icono: "target",
          titulo: "Tu camino a la PPA",
          texto: "En el inicio ves cuánto te falta de cada requisito: las horas totales, el doble mando, el vuelo solo y la travesía.",
          link: { texto: "Ver mi camino a la PPA", url: `${d.appUrl}/dashboard` },
        }
      : {
          icono: "target",
          titulo: "Camino a la PPA, para alumnos",
          texto: "Si estás haciendo el curso, elegí \"Alumno piloto\" como licencia: Vector te dice cuánto te falta de cada requisito.",
          link: { texto: "Ir al Hangar", url: hangar },
        },
    {
      icono: "mail",
      titulo: "Tu resumen del mes",
      texto: "El día 1 te llega un mail con lo que volaste, lo que te falta para la próxima licencia y lo que te queda de saldo o de pack.",
    },
    {
      icono: "zap",
      titulo: "Más rápida",
      texto: "Mudamos la base de datos a São Paulo, al lado del servidor. Las pantallas cargan más rápido.",
    },
    {
      icono: "smartphone",
      titulo: "En tu teléfono, como una app",
      texto: "Abrila en Safari o en Chrome y agregala a la pantalla de inicio: queda con su ícono y se puede consultar sin señal.",
      link: { texto: "Abrir Vector", url: `${d.appUrl}/dashboard` },
    }
  );
  return lista;
}

export function armarMensajeNovedades(d: DatosNovedades): MensajeNovedades {
  const nombre = d.nombre?.trim() || null;
  const asunto = nombre ? `${nombre}, esto es lo nuevo en Vector` : "Lo nuevo en Vector";
  const intro = `${nombre ? `Hola ${nombre}. ` : ""}Desde que te hiciste la cuenta sumamos varias cosas. Te las contamos en un minuto.`;
  const lista = novedades(d);
  const final = d.tieneVuelos
    ? { texto: "Abrir mi bitácora", link: `${d.appUrl}/dashboard` }
    : { texto: "Cargar mi primer vuelo", link: `${d.appUrl}/dashboard/log-flight` };
  const pie = "Te mandamos las novedades de Vector de vez en cuando.";

  const texto = [
    intro,
    "",
    "LO NUEVO",
    ...lista.flatMap((n) => [`- ${n.titulo}: ${n.texto}`, ...(n.link ? [`  ${n.link.url}`] : [])]),
    "",
    `${final.texto}: ${final.link}`,
    "",
    `${pie} Para no recibirlas más: ${d.linkBaja}`,
    "",
    "Vector · Tu bitácora de vuelo, siempre al día.",
  ].join("\n");

  const html = plantillaMail({
    appUrl: d.appUrl,
    preencabezado: d.alumno
      ? "Vuelos con un audio, tu camino a la PPA y una app más rápida."
      : "Vuelos con un audio, tu libro en PDF, el camino a la PPA y una app más rápida.",
    pildora: "Novedades de Vector",
    titulo: ["Vector mejoró.", "Esto es lo nuevo."],
    cuerpo: [
      parrafo(intro),
      `<div style="height:6px;line-height:6px">&nbsp;</div>`,
      etiqueta("Lo nuevo"),
      ...lista.map((n) => bloque(d.appUrl, { icono: n.icono, titulo: n.titulo, filas: [n.texto], link: n.link })),
      `<div style="height:8px;line-height:8px">&nbsp;</div>`,
      boton(final.texto, final.link),
    ].join("\n"),
    pie,
    pieLink: { texto: "No recibirlas más", url: d.linkBaja },
  });

  return { asunto, texto, html };
}
