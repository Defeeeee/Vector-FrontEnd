// Backend falso para sacar capturas de la app sin tocar producción.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
const DIR = new URL(".", import.meta.url).pathname;
const hoy = new Date("2026-10-06T12:00:00Z");
const dia = (n) => new Date(hoy.getTime() - n * 86400000).toISOString().slice(0, 10);
const perfil = { id: "u1", first_name: "Lucía", last_name: "Ferrari", license_type: "PPA", tracking_mode: "packs", whatsapp_phone: "5491100000000", fecha_ppa: null };
const aviones = [
  { id: "a1", user_id: "u1", registration: "LV-ABC", icao: "C152", type: "Cessna 152", type_acft: "MONT-T", is_simulator: false },
  { id: "a2", user_id: "u1", registration: "LV-XYZ", icao: "PA11", type: "Piper PA-11", type_acft: "MONT-T", is_simulator: false },
];
const rutas = ["SADF SADF", "SADF SADM", "SADF SADL", "SADF SAAK", "SADF SAZS", "SADF SADP", "SADF SADF"];
let n = 0;
const vuelos = [];
// Salidas variadas entre las 11:00 y las 19:45 UTC, de a cuartos de hora.
const salida = (d) => 11 * 60 + ((d * 37) % 36) * 15;
const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(Math.round(min % 60)).padStart(2, "0")}`;
for (let d = 420; d >= 2; d -= 5 + (n % 3)) {
  const ruta = rutas[d % rutas.length];
  const travesia = !ruta.startsWith("SADF SADF");
  const noche = d % 23 === 0;
  const dur = Math.round((1.0 + (d % 7) * 0.15 + (travesia ? 0.7 : 0)) * 10) / 10;
  const f = { id: `f${++n}`, user_id: "u1", aircraft_id: d % 4 === 0 ? "a2" : "a1", date: dia(d), route: ruta, landings: travesia ? 2 : 3, duration: dur,
    takeoff: `${dia(d)}T${hhmm(salida(d))}:00Z`, landing: `${dia(d)}T${hhmm(salida(d) + dur * 60)}:00Z`, purpose: "VP" };
  f[noche ? (travesia ? "pic_night_tra" : "pic_night_loc") : (travesia ? "pic_day_tra" : "pic_day_loc")] = dur;
  if (d % 9 === 0) f.capota = 0.5;
  vuelos.push(f);
}
const dashboard = {
  profile: perfil, aircraft: aviones, flights: vuelos, session: { active: false },
  packs: [{ id: "p1", user_id: "u1", name: "Pack 10 h · Aeroclub", total_hours: 10, remaining_hours: 6.5, created_at: dia(30), start_date: dia(30), is_active: true, aircraft_ids: ["a1"] }],
  documents: [
    { id: "d1", user_id: "u1", kind: "cma", blocking: "bloquea", name: "CMA Clase 2", expiry_date: "2027-05-10" },
    { id: "d2", user_id: "u1", kind: "licencia", blocking: "nada", name: "Licencia PPA", expiry_date: null },
    { id: "d3", user_id: "u1", kind: "repaso_vuelo", blocking: "bloquea", name: "Repaso de vuelo", expiry_date: "2027-08-20" },
  ],
  transactions: [], balance: 0, unavailable: [],
  audit_summary: { critical: 0, warning: 0, suppressed: 0, open_total: 0 },
};
const rutasFijas = {
  "/api/profiles": [perfil],
  "/api/dashboard": dashboard,
  "/api/logbooks": [],
  "/api/planned-flights": [],
  "/api/aircraft": aviones,
  "/api/onboarding/estado": { licencia: true, cma: true, aeronave: true, libro: true, vuelos: true, whatsapp: true, arroba: true },
  "/api/audit/summary": { critical: 0, warning: 0, suppressed: 0, open_total: 0 },
  "/api/social/resumen": { handle: "lucia.vuela", solicitudes: 0, actividad_nueva: 0, avatar_url: null },
};
export const DATOS = { perfil, aviones, vuelos };
if (process.argv[1]?.endsWith("backend-falso.mjs")) createServer((req, res) => {
  const ruta = new URL(req.url, "http://x").pathname;
  let cuerpo = rutasFijas[ruta];
  if (ruta === "/api/admin/estadisticas" && existsSync(DIR + "admin-estadisticas.json")) cuerpo = JSON.parse(readFileSync(DIR + "admin-estadisticas.json", "utf8"));
  if (cuerpo === undefined) cuerpo = ruta.endsWith("s") ? [] : {};
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(cuerpo));
}).listen(7599, "127.0.0.1", () => console.log(`backend falso en 7599 · ${vuelos.length} vuelos, ${vuelos.reduce((t, f) => t + f.duration, 0).toFixed(1)} h`));
