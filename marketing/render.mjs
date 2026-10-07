/**
 * Exporta las piezas de `piezas.html` a PNG en `marketing/salida/`, con Chrome headless.
 *
 *   node marketing/render.mjs            # todas
 *   node marketing/render.mjs anuncio-4x5
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PIEZAS = {
  "anuncio-4x5": [1080, 1350],
  "anuncio-1x1": [1080, 1080],
  "anuncio-9x16": [1080, 1920],
  "carrusel-1": [1080, 1350],
  "carrusel-2": [1080, 1350],
  "carrusel-3": [1080, 1350],
  "carrusel-4": [1080, 1350],
  // La publicación de una foto: su propio archivo.
  publicacion: [1080, 1350, "publicacion.html"],
};

mkdirSync(join(AQUI, "salida"), { recursive: true });
const pedidas = process.argv.slice(2);
for (const [id, [w, h, archivo = "piezas.html"]] of Object.entries(PIEZAS)) {
  if (pedidas.length && !pedidas.includes(id)) continue;
  const salida = join(AQUI, "salida", `${id}.png`);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    `--window-size=${w},${h}`, "--virtual-time-budget=8000", `--screenshot=${salida}`,
    `file://${join(AQUI, archivo)}?p=${id}`,
  ], { stdio: "ignore" });
  console.log(`marketing/salida/${id}.png  ${w}×${h}`);
}
