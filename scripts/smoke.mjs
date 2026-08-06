#!/usr/bin/env node
/**
 * Smoke test contra un build de producción real.
 *
 *   npm run build && npm run smoke
 *
 * Levanta `next start`, espera a que atienda, y pega a un puñado de rutas
 * comprobando que ninguna devuelva 5xx. No reemplaza tests: comprueba que la
 * aplicación **arranca y sirve**, que es la clase de falla que `tsc` no ve.
 *
 * ## Qué cubre y qué no
 *
 * Cubre las rutas públicas y las de API que no piden sesión. Ahí un 5xx es
 * siempre un bug.
 *
 * **No cubre el interior del dashboard.** El middleware redirige al login antes
 * de que la página corra, así que sin sesión sólo se comprueba que la redirección
 * ocurra — no que la página renderice. Un crash como el de `/dashboard/log-flight`
 * (`logbooks.find is not a function`, agosto 2026) **no se detecta desde acá**:
 * para eso hace falta correr esto con una cuenta de prueba y su cookie de sesión.
 * Está anotado como pendiente a propósito, para no dar una sensación de cobertura
 * que no existe.
 */

import { spawn } from "node:child_process";

const PORT = process.env.SMOKE_PORT || "3010";
const BASE = `http://127.0.0.1:${PORT}`;

/** `expect` es lo que se considera aceptable. Un 5xx nunca lo es. */
const ROUTES = [
  { path: "/", expect: (s) => s === 200 },
  { path: "/login", expect: (s) => s === 200 },
  { path: "/register", expect: (s) => s === 200 },
  { path: "/recover", expect: (s) => s === 200 },
  { path: "/legal/privacidad", expect: (s) => s === 200 },
  { path: "/legal/terminos", expect: (s) => s === 200 },
  { path: "/no-existe-esta-ruta", expect: (s) => s === 404 },
  // El directorio de aeródromos se sirve sin sesión y lee los TSV del disco:
  // si el build no los copió, esto lo agarra.
  { path: "/api/airports/search?q=SADM", expect: (s) => s === 200, json: (b) => b.results?.[0]?.icao === "SADM" },
  { path: "/api/airports/search?q=GEZ", expect: (s) => s === 200, json: (b) => b.results?.[0]?.icao === "SRDR" },
  // Sin sesión el middleware tiene que redirigir, no explotar.
  { path: "/dashboard", expect: (s) => s === 307 || s === 302 },
  { path: "/dashboard/log-flight", expect: (s) => s === 307 || s === 302 },
  { path: "/dashboard/airports", expect: (s) => s === 307 || s === 302 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // todavía no atiende
    }
    await sleep(500);
  }
  throw new Error(`El server no atendió en ${timeoutMs / 1000}s`);
}

const server = spawn("node_modules/.bin/next", ["start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production" },
});

let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

let failures = 0;

try {
  await waitForServer();

  for (const route of ROUTES) {
    let status = 0;
    let detail = "";
    try {
      const res = await fetch(BASE + route.path, { redirect: "manual" });
      status = res.status;
      if (route.json) {
        const body = await res.json();
        if (!route.json(body)) detail = ` — el cuerpo no tiene la forma esperada`;
      }
    } catch (err) {
      detail = ` — ${err.message}`;
    }

    const ok = route.expect(status) && !detail;
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} ${String(status).padEnd(3)} ${route.path}${detail}`);
  }
} catch (err) {
  console.error(`✗ ${err.message}`);
  failures++;
} finally {
  try { server.kill("SIGTERM"); } catch {}
  await sleep(300);
  try { server.kill("SIGKILL"); } catch {}
}

if (failures) {
  console.error(`\n${failures} ruta(s) fallaron.\n--- salida del server ---\n${serverLog.slice(-3000)}`);
  process.exit(1);
}
console.log(`\n${ROUTES.length} rutas OK.`);
process.exit(0);
