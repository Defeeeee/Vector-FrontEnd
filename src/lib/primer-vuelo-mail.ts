/**
 * El mail del día siguiente al alta, para quien todavía no cargó vuelos.
 *
 * Es **uno solo** (el backend marca a quién se le mandó: `services/recordatorios.py`) y
 * dice cómo empezar, en el orden de lo que menos cuesta: un audio al copiloto, el libro
 * en PDF, y a mano. Nombra lo que le falta a esa persona —el número de WhatsApp, un
 * avión— en vez de un texto igual para todos.
 */

export interface DatosPrimerVuelo {
  nombre: string | null;
  tieneAvion: boolean;
  tieneWhatsapp: boolean;
  /** `https://vector.fdiaznem.com.ar`, sin barra final. */
  appUrl: string;
  /** El link al chat con el copiloto, si está configurado (`lib/copiloto.ts`). */
  linkCopiloto: string | null;
}

export interface MensajePrimerVuelo {
  asunto: string;
  texto: string;
  html: string;
}

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function armarMensajePrimerVuelo(d: DatosPrimerVuelo): MensajePrimerVuelo {
  const nombre = d.nombre?.trim() || null;
  const asunto = nombre ? `${nombre}, ¿cargamos tu primer vuelo?` : "¿Cargamos tu primer vuelo?";
  const registrar = `${d.appUrl}/dashboard/log-flight`;
  const importar = `${d.appUrl}/dashboard/log-flight/import`;
  const hangar = `${d.appUrl}/dashboard/settings`;

  const whatsapp = d.tieneWhatsapp
    ? "Mandale un audio al copiloto por WhatsApp contando el vuelo, y lo carga cuando confirmás."
    : "Dejá tu celular en el Hangar y mandale un audio al copiloto por WhatsApp contando el vuelo: lo carga cuando confirmás.";
  const aMano = d.tieneAvion
    ? "Registralo a mano: salida, llegada y horarios. Vector calcula el tiempo y el desglose."
    : "Registralo a mano: primero cargá el avión en el Hangar, y después salida, llegada y horarios.";

  const opciones: { titulo: string; texto: string; link: string; boton: string }[] = [
    { titulo: "Con un audio", texto: whatsapp, link: d.tieneWhatsapp && d.linkCopiloto ? d.linkCopiloto : hangar, boton: d.tieneWhatsapp && d.linkCopiloto ? "Abrir WhatsApp" : "Ir al Hangar" },
    { titulo: "Con tu libro en PDF", texto: "Subí las hojas escaneadas de tu libro de papel y Vector carga los vuelos.", link: importar, boton: "Importar el PDF" },
    { titulo: "A mano", texto: aMano, link: d.tieneAvion ? registrar : hangar, boton: d.tieneAvion ? "Registrar un vuelo" : "Cargar el avión" },
  ];

  const saludo = nombre ? `Hola ${nombre}:` : "Hola:";
  const intro =
    "Ayer te hiciste la cuenta en Vector. Para decirte si podés volar hoy, cuánto te falta " +
    "para la PCA y cuánto te queda del pack, le falta lo principal: tus vuelos.";
  const pie =
    "Te escribimos una sola vez, al día siguiente del alta. Si no te interesa, no hace falta que hagas nada.";

  const texto = [
    saludo,
    "",
    intro,
    "",
    "Tres formas de empezar:",
    ...opciones.flatMap((o, i) => [`${i + 1}. ${o.titulo}: ${o.texto}`, `   ${o.link}`]),
    "",
    pie,
    "",
    "Vector · Tu bitácora de vuelo, siempre al día.",
  ].join("\n");

  const html = `<!doctype html><html lang="es-AR"><body style="margin:0;background:#fafafa">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#18181b">
  <p style="font-size:16px;margin:0 0 12px">${escapar(saludo)}</p>
  <p style="font-size:15px;line-height:1.55;color:#3f3f46;margin:0 0 20px">${escapar(intro)}</p>
  <p style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;margin:0 0 10px">Tres formas de empezar</p>
  ${opciones
    .map(
      (o) => `<div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:16px 18px;margin:0 0 10px">
    <p style="font-size:15px;font-weight:700;margin:0 0 4px">${escapar(o.titulo)}</p>
    <p style="font-size:14px;line-height:1.5;color:#52525b;margin:0 0 12px">${escapar(o.texto)}</p>
    <a href="${escapar(o.link)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:700;font-size:13px">${escapar(o.boton)}</a>
  </div>`
    )
    .join("\n  ")}
  <p style="font-size:12px;line-height:1.5;color:#a1a1aa;margin:20px 0 0">${escapar(pie)}</p>
  <p style="font-size:12px;color:#a1a1aa;margin:6px 0 0">Vector · <a href="${escapar(d.appUrl)}" style="color:#a1a1aa">${escapar(d.appUrl.replace(/^https?:\/\//, ""))}</a></p>
</div></body></html>`;

  return { asunto, texto, html };
}
