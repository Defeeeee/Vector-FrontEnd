/**
 * El panel de administración (`/dashboard/admin`): los tipos de lo que manda
 * `GET /admin/estadisticas` y todo lo que se escribe con fechas.
 *
 * Las fechas se escriben acá, en el server, y a mano: `toLocaleString` difiere entre
 * Node y Chrome (invariante 1), y el panel es para Argentina, así que la cuenta es
 * UTC−3 fija, igual que en el backend (`services/estadisticas.py`).
 */

export interface EstadisticasAdmin {
  generado: string;
  hoy: string;
  admins_excluidos: number;
  no_disponible: string[];
  totales: {
    cuentas: number;
    altas_hoy: number;
    altas_7d: number;
    altas_30d: number;
    activos_7d: number;
    activos_30d: number;
    con_vuelos: number;
    vuelos: number;
    vuelos_30d: number;
    horas: number;
    con_arroba: number;
    con_whatsapp: number;
    con_push: number;
    publicaciones: number;
    seguimientos: number;
    aplausos: number;
    comentarios: number;
    reportes: number;
    chats_whatsapp: number;
  };
  altas_por_dia: { fecha: string; altas: number; acumulado: number }[];
  ultimo_ingreso: { tramo: string; cuentas: number }[];
  activacion: { paso: string; cuentas: number; pct: number }[];
  uso_funciones: { funcion: string; cuentas: number; pct: number }[];
  licencias: { licencia: string; cuentas: number }[];
  vuelos_por_mes: { mes: string; vuelos: number; horas: number; pilotos: number }[];
  top_aerodromos: { codigo: string; vuelos: number }[];
  top_aeronaves: { tipo: string; vuelos: number }[];
  cohortes: { semana: string; altas: number; con_avion: number; con_vuelo: number }[];
  ultimas_altas: {
    alta: string | null;
    ultimo_ingreso: string | null;
    arroba: string | null;
    licencia: string | null;
    avion: boolean;
    cma: boolean;
    whatsapp: boolean;
    vuelos: number;
  }[];
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const HORA_ARGENTINA_MS = -3 * 60 * 60 * 1000;
const dos = (n: number) => String(n).padStart(2, "0");

/** "2026-09-23" → "23/09". */
export function diaCorto(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "2026-09" → "sep 26". */
export function mesCorto(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${String(y).slice(2)}`;
}

/** Un instante en UTC como "23/09 21:05", en hora argentina. `null` si no hay. */
export function momento(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t + HORA_ARGENTINA_MS);
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

/** Cuánto hace, respecto de `ahora`: "recién", "hace 25 min", "hace 3 h", "hace 2 días". */
export function haceCuanto(iso: string | null, ahora: string): string {
  if (!iso) return "nunca";
  const min = Math.floor((Date.parse(ahora) - Date.parse(iso)) / 60000);
  if (Number.isNaN(min)) return "—";
  if (min < 2) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

/** Un porcentaje con coma y sin decimales de más: 66,7 %, 50 %. */
export function porcentaje(parte: number, total: number): string {
  if (!total) return "—";
  const p = Math.round((1000 * parte) / total) / 10;
  return `${String(p).replace(".", ",")} %`;
}

/** Un número con punto de miles y coma decimal, como en el libro: 1.252 · 150,1. */
export function numero(n: number, decimales = 0): string {
  const [ent, dec] = n.toFixed(decimales).split(".");
  const conMiles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec ? `${conMiles},${dec}` : conMiles;
}

/** Las series con su etiqueta ya escrita, para que el gráfico no haga cuentas con fechas. */
export function seriesDelPanel(e: EstadisticasAdmin) {
  return {
    altas: e.altas_por_dia.map((p) => ({ ...p, etiqueta: diaCorto(p.fecha) })),
    vuelosPorMes: e.vuelos_por_mes.map((p) => ({ ...p, etiqueta: mesCorto(p.mes) })),
    cohortes: e.cohortes.map((c) => ({ ...c, etiqueta: `semana del ${diaCorto(c.semana)}` })),
  };
}
