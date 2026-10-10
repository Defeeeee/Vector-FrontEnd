import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { PlanOaci } from "./plan-de-vuelo";

/**
 * El formulario de plan de vuelo modelo OACI, dibujado y lleno.
 *
 * **Es el de la AIP Argentina, ENR 1.10, Apéndice 1** (página ENR 1.10-9), con sus rótulos
 * en inglés y castellano. En la AIP es una imagen de 645×873 px, que impresa se ve
 * borrosa. Por eso no se usa de fondo: **se redibuja con vectores en la misma grilla**.
 * Las coordenadas de abajo son los píxeles de esa página escalada a 1415 de ancho
 * (`X()` e `Y()` los pasan a puntos), así que cada caja se puede contrastar contra la
 * imagen de la AIP.
 *
 * Corre en el navegador: el planificador funciona sin señal, y el plan de vuelo también.
 * Por eso usa las fuentes estándar del PDF y no lee archivos.
 */

const ANCHO = 595.28; // A4
const ALTO = 841.89;

/** La grilla: el marco del formulario en la página de la AIP va de x=139 a x=1259. */
const K = (ANCHO - 60) / (1259 - 139);
const X = (px: number) => 30 + (px - 139) * K;
/** De arriba para abajo, como la imagen. */
const Y = (py: number) => ALTO - (46 + (py - 222) * K);

const NEGRO = rgb(0, 0, 0);
const GRIS = rgb(0.87, 0.87, 0.87);
const BLANCO = rgb(1, 1, 1);
/** Lo que completa el piloto, en azul de birome: se distingue del formulario de un vistazo. */
const TINTA = rgb(0.05, 0.16, 0.55);

interface Fuentes {
  normal: PDFFont;
  negrita: PDFFont;
  tinta: PDFFont;
}

/* -------------------------------------------------------------------------- */
/* Primitivas                                                                  */
/* -------------------------------------------------------------------------- */

function caja(page: PDFPage, x1: number, y1: number, x2: number, y2: number, relleno = BLANCO, grosor = 0.6) {
  page.drawRectangle({
    x: X(x1),
    y: Y(y2),
    width: X(x2) - X(x1),
    height: Y(y1) - Y(y2),
    color: relleno,
    borderColor: NEGRO,
    borderWidth: grosor,
  });
}

function linea(page: PDFPage, x1: number, y1: number, x2: number, y2: number, grosor = 0.6) {
  page.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: grosor, color: NEGRO });
}

/** Una caja de casilla con las marcas de cada carácter abajo, como el formulario impreso. */
function celdas(page: PDFPage, x1: number, y1: number, x2: number, y2: number, n: number) {
  caja(page, x1, y1, x2, y2);
  const ancho = (x2 - x1) / n;
  for (let i = 1; i < n; i++) linea(page, x1 + ancho * i, y2, x1 + ancho * i, y2 - (y2 - y1) * 0.3, 0.5);
}

/** Rótulo de dos renglones: el inglés arriba, el castellano abajo y más chico. */
function rotulo(page: PDFPage, f: Fuentes, ingles: string, castellano: string, x: number, y: number) {
  page.drawText(ingles, { x: X(x), y: Y(y) - 5, size: 5.6, font: f.normal, color: NEGRO });
  if (castellano) page.drawText(castellano, { x: X(x), y: Y(y) - 10.6, size: 5, font: f.normal, color: NEGRO });
}

/** El guion que precede a cada casilla en el formulario. */
function guion(page: PDFPage, x1: number, x2: number, y: number) {
  linea(page, x1, y, x2, y, 1);
}

/** La flecha que separa elementos dentro de un renglón. */
function flecha(page: PDFPage, x1: number, x2: number, y: number) {
  linea(page, x1, y, x2 - 8, y, 1);
  const px = X(x2);
  const py = Y(y);
  page.drawSvgPath(`M 0 -3 L 5 0 L 0 3 Z`, { x: px - 5, y: py, color: NEGRO });
}

/** El "fin de campo" (<<≡) del margen derecho. */
function finDeCampo(page: PDFPage, f: Fuentes, x: number, y: number, parentesis = false) {
  let px = X(x);
  const py = Y(y) - 3.2;
  if (parentesis) {
    page.drawText(")", { x: px, y: py - 0.5, size: 10, font: f.negrita });
    px += 4.5;
  }
  page.drawText("<<", { x: px, y: py - 0.5, size: 10, font: f.normal });
  const desde = px + 11;
  for (let i = 0; i < 3; i++) {
    const ly = py + 1 + i * 2.6;
    page.drawLine({ start: { x: desde, y: ly }, end: { x: desde + 9, y: ly }, thickness: 0.8, color: NEGRO });
  }
}

/** Texto centrado, un carácter por celda. */
function llenarCeldas(page: PDFPage, f: Fuentes, texto: string, x1: number, y1: number, x2: number, y2: number, n: number) {
  const ancho = (X(x2) - X(x1)) / n;
  const alto = Y(y1) - Y(y2);
  const size = Math.min(10, alto * 0.62);
  [...texto.slice(0, n)].forEach((c, i) => {
    const w = f.tinta.widthOfTextAtSize(c, size);
    page.drawText(c, { x: X(x1) + ancho * i + (ancho - w) / 2, y: Y(y2) + (alto - size * 0.7) / 2, size, font: f.tinta, color: TINTA });
  });
}

/** Texto libre dentro de una caja, alineado a la izquierda. Se achica si no entra. */
function llenarCaja(page: PDFPage, f: Fuentes, texto: string, x1: number, y1: number, x2: number, y2: number, maximo = 9) {
  if (!texto) return;
  const ancho = X(x2) - X(x1) - 6;
  const alto = Y(y1) - Y(y2);
  let size = Math.min(maximo, alto * 0.6);
  while (size > 5 && f.tinta.widthOfTextAtSize(texto, size) > ancho) size -= 0.25;
  page.drawText(texto, { x: X(x1) + 3, y: Y(y2) + (alto - size * 0.7) / 2, size, font: f.tinta, color: TINTA });
}

/**
 * Texto que corre por varios renglones (la ruta, la casilla 18). Corta entre palabras;
 * `renglones` da dónde empieza y termina cada uno.
 */
function llenarRenglones(
  page: PDFPage,
  f: Fuentes,
  texto: string,
  renglones: { x1: number; x2: number; y1: number; y2: number }[]
): boolean {
  const size = 8.6;
  const palabras = texto.split(" ").filter(Boolean);
  let r = 0;
  let actual = "";
  const volcar = () => {
    const rg = renglones[r];
    const alto = Y(rg.y1) - Y(rg.y2);
    page.drawText(actual, { x: X(rg.x1) + 3, y: Y(rg.y2) + (alto - size * 0.7) / 2, size, font: f.tinta, color: TINTA });
  };
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    const rg = renglones[r];
    if (f.tinta.widthOfTextAtSize(prueba, size) <= X(rg.x2) - X(rg.x1) - 6) {
      actual = prueba;
      continue;
    }
    volcar();
    r += 1;
    if (r >= renglones.length) return false;
    actual = p;
  }
  if (actual) volcar();
  return true;
}

/**
 * Una letra de la casilla 19 en su recuadro. **`disponible: false` la tacha**, que es lo
 * que pide la ENR 1.10: "TÁCHESE U si no está disponible la frecuencia UHF".
 */
function letra(page: PDFPage, f: Fuentes, l: string, x1: number, y1: number, x2: number, y2: number, disponible: boolean) {
  caja(page, x1, y1, x2, y2, BLANCO, 0.9);
  const size = 11;
  const w = f.negrita.widthOfTextAtSize(l, size);
  const alto = Y(y1) - Y(y2);
  page.drawText(l, { x: X(x1) + (X(x2) - X(x1) - w) / 2, y: Y(y2) + (alto - size * 0.7) / 2, size, font: f.negrita, color: NEGRO });
  if (!disponible) {
    const t = { thickness: 1.4, color: TINTA };
    page.drawLine({ start: { x: X(x1) + 1.5, y: Y(y2) + 1.5 }, end: { x: X(x2) - 1.5, y: Y(y1) - 1.5 }, ...t });
    page.drawLine({ start: { x: X(x1) + 1.5, y: Y(y1) - 1.5 }, end: { x: X(x2) - 1.5, y: Y(y2) + 1.5 }, ...t });
  }
}

function barra(page: PDFPage, f: Fuentes, x: number, y: number) {
  page.drawText("/", { x: X(x), y: Y(y) - 4, size: 11, font: f.negrita });
}

/* -------------------------------------------------------------------------- */
/* El formulario                                                               */
/* -------------------------------------------------------------------------- */

export interface OpcionesPdfPlan {
  /** La firma dibujada en la pantalla, como PNG. Sin firma queda el lugar para firmar a mano. */
  firmaPng?: Uint8Array;
  /** Pie de página: de dónde sale el formulario. */
  pie?: string;
}

export async function pdfPlanDeVuelo(p: PlanOaci, opciones: OpcionesPdfPlan = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Plan de vuelo ${p.c7} ${p.c13ad}-${p.c16ad}`);
  doc.setAuthor(p.presentadoPor);
  doc.setCreator("Vector");
  doc.setProducer("Vector");
  doc.setSubject("Formulario de plan de vuelo modelo OACI (AIP Argentina, ENR 1.10, Apéndice 1)");

  const f: Fuentes = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    tinta: await doc.embedFont(StandardFonts.CourierBold),
  };
  const page = doc.addPage([ANCHO, ALTO]);

  // Marco, fondo gris y título.
  caja(page, 139, 222, 1259, 1755, BLANCO, 1.2);
  caja(page, 139, 272, 1259, 1662, GRIS, 0);
  linea(page, 139, 272, 1259, 272, 1.6);
  const titulo = (t: string, py: number, size: number, font: PDFFont) =>
    page.drawText(t, { x: X(698) - font.widthOfTextAtSize(t, size) / 2, y: Y(py) - size * 0.8, size, font });
  titulo("FLIGHT PLAN", 228, 11, f.negrita);
  titulo("PLAN DE VUELO", 248, 10, f.normal);

  // Prioridad, destinatarios, hora de depósito y remitente: los completa la oficina.
  rotulo(page, f, "PRIORITY", "Prioridad", 177, 280);
  page.drawText("<<", { x: X(155), y: Y(326), size: 10, font: f.normal });
  page.drawText("FF", { x: X(207), y: Y(327), size: 11, font: f.negrita });
  flecha(page, 262, 292, 320);
  rotulo(page, f, "ADDRESSEE(S)", "Destinatarios", 333, 280);
  caja(page, 330, 307, 1257, 337);
  caja(page, 330, 337, 1257, 368);
  caja(page, 330, 368, 1165, 398);
  finDeCampo(page, f, 1180, 385);
  rotulo(page, f, "FILING TIME", "Hora de depósito", 193, 400);
  celdas(page, 139, 427, 326, 459, 6);
  flecha(page, 333, 357, 445);
  rotulo(page, f, "ORIGINATOR", "Remitente", 452, 400);
  celdas(page, 362, 427, 606, 459, 8);
  finDeCampo(page, f, 618, 445);
  rotulo(page, f, "SPECIFIC IDENTIFICATION OF ADDRESSEE(S) AND/OR ORIGINATOR", "Identificación exacta de los destinatarios o del remitente", 176, 463);
  caja(page, 139, 495, 1259, 520);
  linea(page, 139, 520, 1259, 520, 1.6);

  // 3, 7 y 8.
  rotulo(page, f, "3  MESSAGE TYPE", "Tipo de mensaje", 177, 526);
  page.drawText("<<", { x: X(150), y: Y(576), size: 10, font: f.normal });
  page.drawText("(FPL", { x: X(225), y: Y(578), size: 13, font: f.negrita });
  rotulo(page, f, "7  AIRCRAFT IDENTIFICATION", "Identificación de la aeronave", 470, 526);
  guion(page, 412, 440, 572);
  celdas(page, 451, 555, 667, 588, 7);
  llenarCeldas(page, f, p.c7, 451, 555, 667, 588, 7);
  rotulo(page, f, "8  FLIGHT RULES", "Reglas de vuelo", 835, 526);
  guion(page, 850, 870, 572);
  caja(page, 879, 557, 913, 587);
  llenarCeldas(page, f, p.c8reglas, 879, 557, 913, 587, 1);
  rotulo(page, f, "TYPE OF FLIGHT", "Tipo de vuelo", 1115, 526);
  caja(page, 1129, 557, 1163, 587);
  llenarCeldas(page, f, p.c8tipo, 1129, 557, 1163, 587, 1);
  finDeCampo(page, f, 1178, 572);

  // 9 y 10.
  rotulo(page, f, "9  NUMBER", "Número", 176, 588);
  guion(page, 145, 165, 631);
  celdas(page, 173, 615, 233, 647, 2);
  llenarCeldas(page, f, p.c9numero, 173, 615, 233, 647, 2);
  rotulo(page, f, "TYPE OF AIRCRAFT", "Tipo de aeronave", 390, 588);
  celdas(page, 389, 615, 510, 647, 4);
  llenarCeldas(page, f, p.c9tipo, 389, 615, 510, 647, 4);
  rotulo(page, f, "WAKE TURBULENCE CAT.", "Cat. de estela turbulenta", 697, 588);
  barra(page, f, 737, 636);
  caja(page, 756, 617, 790, 647);
  llenarCeldas(page, f, p.c9estela, 756, 617, 790, 647, 1);
  rotulo(page, f, "10  EQUIPMENT", "Equipo", 1018, 588);
  guion(page, 944, 966, 631);
  caja(page, 976, 615, 1163, 647);
  llenarCaja(page, f, `${p.c10a}/${p.c10b}`, 976, 615, 1163, 647);
  finDeCampo(page, f, 1178, 631);

  // 13.
  rotulo(page, f, "13  DEPARTURE AERODROME", "Aeródromo de salida", 234, 651);
  guion(page, 230, 252, 694);
  celdas(page, 263, 678, 385, 709, 4);
  llenarCeldas(page, f, p.c13ad, 263, 678, 385, 709, 4);
  rotulo(page, f, "TIME", "Hora", 585, 651);
  celdas(page, 542, 678, 663, 709, 4);
  llenarCeldas(page, f, p.c13hora, 542, 678, 663, 709, 4);
  finDeCampo(page, f, 680, 694);

  // 15.
  rotulo(page, f, "15  CRUISING SPEED", "Velocidad de crucero", 170, 711);
  guion(page, 144, 163, 753);
  celdas(page, 169, 738, 321, 768, 5);
  llenarCeldas(page, f, p.c15velocidad, 169, 738, 321, 768, 5);
  rotulo(page, f, "LEVEL", "Nivel", 408, 711);
  celdas(page, 357, 738, 508, 768, 5);
  llenarCeldas(page, f, p.c15nivel, 357, 738, 508, 768, 5);
  flecha(page, 513, 537, 755);
  rotulo(page, f, "ROUTE", "Ruta", 555, 711);
  const ruta = [
    { x1: 539, x2: 1259, y1: 738, y2: 768 },
    { x1: 139, x2: 1259, y1: 768, y2: 800 },
    { x1: 139, x2: 1259, y1: 800, y2: 831 },
    { x1: 139, x2: 1259, y1: 831, y2: 862 },
    { x1: 139, x2: 1160, y1: 862, y2: 894 },
  ];
  for (const r of ruta) caja(page, r.x1, r.y1, r.x2, r.y2);
  finDeCampo(page, f, 1178, 880);
  llenarRenglones(page, f, p.c15ruta, ruta);

  // 16.
  rotulo(page, f, "16  DESTINATION AERODROME", "Aeródromo de destino", 238, 924);
  guion(page, 230, 252, 969);
  celdas(page, 262, 953, 383, 985, 4);
  llenarCeldas(page, f, p.c16ad, 262, 953, 383, 985, 4);
  rotulo(page, f, "TOTAL EET", "EET Total", 545, 900);
  page.drawText("HR.  MIN", { x: X(574), y: Y(940) - 5, size: 5.6, font: f.normal });
  celdas(page, 538, 953, 661, 985, 4);
  linea(page, 599.5, 953, 599.5, 985, 0.9);
  llenarCeldas(page, f, p.c16eet, 538, 953, 661, 985, 4);
  flecha(page, 745, 780, 969);
  rotulo(page, f, "ALTN AERODROME", "Aeródromo alt.", 784, 924);
  celdas(page, 788, 953, 910, 985, 4);
  llenarCeldas(page, f, p.c16altn1, 788, 953, 910, 985, 4);
  flecha(page, 995, 1030, 969);
  rotulo(page, f, "2ND ALTN AERODROME", "2° aeródromo alt.", 1010, 924);
  celdas(page, 1036, 953, 1158, 985, 4);
  llenarCeldas(page, f, p.c16altn2, 1036, 953, 1158, 985, 4);
  finDeCampo(page, f, 1178, 969);

  // 18.
  rotulo(page, f, "18  OTHER INFORMATION", "Otros datos", 172, 988);
  guion(page, 145, 165, 1029);
  const otros = [
    { x1: 170, x2: 1259, y1: 1015, y2: 1045 },
    { x1: 139, x2: 1259, y1: 1045, y2: 1076 },
    { x1: 139, x2: 1259, y1: 1076, y2: 1107 },
    { x1: 139, x2: 1143, y1: 1107, y2: 1138 },
  ];
  for (const r of otros) caja(page, r.x1, r.y1, r.x2, r.y2);
  finDeCampo(page, f, 1158, 1123, true);
  llenarRenglones(page, f, p.c18, otros);
  linea(page, 139, 1138, 1259, 1138, 1.2);

  // 19: información suplementaria.
  const sup = "SUPPLEMENTARY INFORMATION (NOT TO BE TRANSMITTED IN FPL MESSAGES)";
  const supEs = "Información suplementaria (EN LOS MENSAJES FPL NO HAY QUE TRANSMITIR ESTOS DATOS)";
  page.drawText(sup, { x: X(697) - f.normal.widthOfTextAtSize(sup, 5.8) / 2, y: Y(1146) - 5, size: 5.8, font: f.normal });
  page.drawText(supEs, { x: X(697) - f.normal.widthOfTextAtSize(supEs, 5.2) / 2, y: Y(1146) - 11, size: 5.2, font: f.normal });

  const c = p.c19;
  rotulo(page, f, "19  ENDURANCE", "Autonomía", 173, 1179);
  page.drawText("HR/MIN", { x: X(276), y: Y(1218) - 5, size: 5.6, font: f.normal });
  guion(page, 160, 182, 1251);
  page.drawText("E", { x: X(192), y: Y(1258), size: 11, font: f.negrita });
  barra(page, f, 212, 1252);
  celdas(page, 232, 1235, 354, 1265, 4);
  linea(page, 293, 1235, 293, 1265, 0.9);
  llenarCeldas(page, f, c.autonomia, 232, 1235, 354, 1265, 4);
  flecha(page, 440, 462, 1251);
  rotulo(page, f, "PERSONS ON BOARD", "Personas a bordo", 496, 1204);
  page.drawText("P", { x: X(468), y: Y(1258), size: 11, font: f.negrita });
  barra(page, f, 489, 1252);
  celdas(page, 506, 1235, 597, 1265, 3);
  llenarCaja(page, f, c.personas, 506, 1235, 597, 1265);
  rotulo(page, f, "EMERGENCY RADIO", "Equipo radio de emergencia", 997, 1190);
  for (const [t, x] of [["UHF", 948], ["VHF", 1040], ["ELT", 1133]] as const) {
    page.drawText(t, { x: X(x), y: Y(1222) - 5, size: 5.6, font: f.normal });
  }
  flecha(page, 860, 892, 1251);
  page.drawText("R", { x: X(906), y: Y(1258), size: 11, font: f.negrita });
  barra(page, f, 926, 1252);
  letra(page, f, "U", 942, 1236, 975, 1268, c.radio.u);
  letra(page, f, "V", 1035, 1236, 1068, 1268, c.radio.v);
  letra(page, f, "E", 1127, 1236, 1160, 1268, c.radio.e);

  rotulo(page, f, "SURVIVAL EQUIPMENT", "Equipo de supervivencia", 232, 1272);
  flecha(page, 188, 222, 1341);
  letra(page, f, "S", 228, 1325, 262, 1358, c.supervivencia.s);
  barra(page, f, 292, 1343);
  for (const [t, es, x] of [["POLAR", "Polar", 318], ["DESERT", "Desértico", 412], ["MARITIME", "Marítimo", 497], ["JUNGLE", "Selva", 598]] as const) {
    rotulo(page, f, t, es, x, 1296);
  }
  letra(page, f, "P", 323, 1325, 357, 1358, c.supervivencia.p);
  letra(page, f, "D", 415, 1325, 449, 1358, c.supervivencia.d);
  letra(page, f, "M", 507, 1325, 541, 1358, c.supervivencia.m);
  letra(page, f, "J", 600, 1325, 634, 1358, c.supervivencia.j);
  rotulo(page, f, "JACKETS", "Chalecos", 754, 1276);
  flecha(page, 708, 742, 1341);
  letra(page, f, "J", 755, 1325, 789, 1358, c.chalecos.j);
  barra(page, f, 815, 1343);
  for (const [t, es, x] of [["LIGHT", "Luz", 843], ["FLUORES", "Fluor.", 934], ["UHF", "", 1037], ["VHF", "", 1129]] as const) {
    rotulo(page, f, t, es, x, 1296);
  }
  letra(page, f, "L", 848, 1325, 882, 1358, c.chalecos.l);
  letra(page, f, "F", 940, 1325, 974, 1358, c.chalecos.f);
  letra(page, f, "U", 1035, 1325, 1068, 1358, c.chalecos.u);
  letra(page, f, "V", 1127, 1325, 1160, 1358, c.chalecos.v);

  rotulo(page, f, "DINGHIES", "Botes neumáticos", 230, 1362);
  for (const [t, es, x] of [["NUMBER", "Número", 238], ["CAPACITY", "Capacidad", 343], ["COVER", "Cubierta", 432], ["COLOUR", "Color", 625]] as const) {
    rotulo(page, f, t, es, x, 1387);
  }
  flecha(page, 145, 180, 1433);
  letra(page, f, "D", 182, 1417, 216, 1448, c.botes.d);
  barra(page, f, 219, 1434);
  celdas(page, 232, 1417, 292, 1448, 2);
  llenarCeldas(page, f, c.botes.numero, 232, 1417, 292, 1448, 2);
  flecha(page, 296, 321, 1433);
  celdas(page, 323, 1417, 413, 1448, 3);
  llenarCeldas(page, f, c.botes.capacidad, 323, 1417, 413, 1448, 3);
  flecha(page, 417, 441, 1433);
  letra(page, f, "C", 443, 1417, 477, 1448, c.botes.c);
  flecha(page, 481, 506, 1433);
  caja(page, 508, 1417, 787, 1448);
  llenarCaja(page, f, c.botes.color, 508, 1417, 787, 1448);
  finDeCampo(page, f, 805, 1433);

  rotulo(page, f, "AIRCRAFT COLOUR AND MARKINGS", "Color y marcas de la aeronave", 232, 1452);
  page.drawText("A", { x: X(190), y: Y(1500), size: 12, font: f.negrita });
  barra(page, f, 214, 1495);
  caja(page, 232, 1478, 1259, 1508);
  llenarCaja(page, f, c.colorMarcas, 232, 1478, 1259, 1508);

  rotulo(page, f, "REMARKS", "Observaciones", 232, 1512);
  flecha(page, 145, 180, 1556);
  letra(page, f, "N", 184, 1540, 216, 1571, c.observaciones !== null);
  barra(page, f, 219, 1558);
  caja(page, 230, 1540, 1158, 1571);
  llenarCaja(page, f, c.observaciones ?? "", 230, 1540, 1158, 1571);
  finDeCampo(page, f, 1178, 1556);

  rotulo(page, f, "PILOT-IN-COMMAND", "Piloto al mando", 232, 1574);
  page.drawText("C", { x: X(196), y: Y(1622), size: 12, font: f.negrita });
  caja(page, 230, 1600, 783, 1631);
  llenarCaja(page, f, c.piloto, 230, 1600, 783, 1631);
  finDeCampo(page, f, 790, 1616, true);

  // Presentado por y espacio reservado.
  page.drawText("FILED BY / Presentado por", { x: X(248), y: Y(1640) - 6, size: 5.6, font: f.normal });
  linea(page, 139, 1662, 1259, 1662, 1);
  linea(page, 480, 1662, 480, 1755, 0.8);
  rotulo(page, f, "SPACE RESERVED FOR ADDITIONAL REQUIREMENTS", "Espacio reservado para requisitos adicionales", 487, 1666);
  llenarCaja(page, f, p.presentadoPor, 139, 1662, 480, 1690, 8);
  if (opciones.firmaPng) {
    const firma = await doc.embedPng(opciones.firmaPng);
    const maxAncho = X(470) - X(150);
    const maxAlto = Y(1692) - Y(1750);
    const escala = Math.min(maxAncho / firma.width, maxAlto / firma.height);
    page.drawImage(firma, { x: X(150), y: Y(1750), width: firma.width * escala, height: firma.height * escala });
  }

  if (opciones.pie) {
    page.drawText(opciones.pie, { x: X(139), y: Y(1755) - 14, size: 6, font: f.normal, color: rgb(0.45, 0.45, 0.45) });
  }

  return doc.save();
}
