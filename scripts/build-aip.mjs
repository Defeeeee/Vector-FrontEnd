#!/usr/bin/env node
/**
 * Baja del AIP de ANAC los datos operativos de los aeródromos **controlados** y guarda
 * el texto tal como lo publica el documento oficial.
 *
 *   npm run build:aip
 *   npm run build:aip -- /ruta/a/pdfs   (usa PDF ya bajados: <ICAO>.pdf)
 *
 * ## Por qué existe, que es una historia fea
 *
 * Vector mostraba las frecuencias de estos aeródromos desde una tabla **escrita a mano**
 * en `lib/madhel-reference.ts`, rotulada en pantalla como "Ficha Operativa Oficial ANAC
 * MADHEL". No eran de MADHEL y no eran correctas: San Fernando figuraba con TWR en
 * 118.45 cuando el AIP dice 119.00 y 120.05, y de las veintiséis frecuencias de la tabla
 * **sólo tres coincidían con el AIP**. Las pistas estaban igual de mal — Aeroparque con
 * 2700 m cuando mide 2350, y El Palomar con la 16/34 cuando es la 17/35.
 *
 * El hueco que esa tabla tapaba es real: para un aeródromo **controlado**, la API de
 * MADHEL devuelve `radio: []`, `rwy: []`, `fuel: ""` y `telephone: []`. ANAC no lo
 * publica ahí; lo publica en el AIP, en la sección AD 2 de cada aeródromo. Lo que estaba
 * mal no era tapar el hueco: era taparlo con datos inventados y presentarlos como
 * oficiales.
 *
 * ## Qué guarda, y por qué guarda texto y no campos
 *
 * Escribe `src/data/aip/<ICAO>.txt` con los bloques **AD 2.2** (datos geográficos y
 * administrativos), **AD 2.4** (combustible), **AD 2.12** (pistas) y **AD 2.18**
 * (comunicaciones) extraídos del PDF, *verbatim*, y `src/data/aip-fuentes.tsv` con el
 * documento, la edición y la fecha de vigencia de cada uno.
 *
 * El texto crudo es la red de seguridad. Los valores que la app muestra viven en
 * `src/data/aip-ad.tsv`, curados a mano —las tablas del AIP tienen ocho maquetaciones
 * distintas y un parser que las adivine todas es más frágil que un par de ojos—, y
 * `aip.test.ts` **verifica que cada frecuencia y cada medida aparezca literalmente en el
 * texto extraído del PDF**. Con esa prueba, ninguno de los errores de arriba habría
 * llegado a producción: no se puede escribir un número que el AIP no diga.
 *
 * ## El ciclo AIRAC
 *
 * El AIP se enmienda cada 28 días. Este script es idempotente: se vuelve a correr, se
 * mira el diff del `.txt`, y si cambió algo se actualiza el TSV. La fecha de vigencia va
 * a `aip-fuentes.tsv` y **se muestra en pantalla**, para que el piloto sepa de cuándo es
 * lo que está leyendo.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";

const BASE = "https://ais.anac.gob.ar";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = path.join(RAIZ, "src", "data", "aip");
const FUENTES = path.join(RAIZ, "src", "data", "aip-fuentes.tsv");

/**
 * Los aeródromos controlados que MADHEL deja vacíos.
 *
 * No es una lista arbitraria: son exactamente los que tenían entrada en la tabla vieja,
 * menos La Plata. **La Plata no va**, y el motivo es la corrección del otro bug: no es
 * controlado, MADHEL sí publica sus datos, y la tabla escrita a mano se los estaba
 * pisando con una pista de tierra de 1435 m que en realidad es asfalto de 1427 m.
 */
const AERODROMOS = ["SABE", "SAAR", "SACO", "SADF", "SADP", "SAEZ", "SAZM", "SAZS"];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * El listado de documentos AD del AIP.
 *
 * Se pide con `X-Requested-With`, y no es superstición: sin esa cabecera el servidor
 * contesta su página de error 404. La página real lo manda porque el listado se carga
 * por AJAX.
 */
async function listadoAd() {
  const res = await fetch(`${BASE}/aip/ad`, {
    headers: { "User-Agent": UA, Referer: `${BASE}/aip`, "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok) throw new Error(`El listado AD contestó ${res.status}`);
  return res.text();
}

/** La fila `<ICAO>-AD-2.0` del listado: su enlace, su edición y su fecha. */
function documentoDe(html, icao) {
  for (const fila of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const texto = fila
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!texto.includes(`${icao}-AD-2.0`)) continue;
    const href = /href="([^"]+)"/.exec(fila);
    // "… | 01/26 11-Jun-26" — la edición y desde cuándo rige.
    const sello = /(\d{2}\/\d{2})\s+(\d{2}-[A-Za-z]{3}-\d{2})/.exec(texto);
    if (!href || !sello) continue;
    return { url: BASE + href[1], edicion: sello[1], vigenteDesde: sello[2], titulo: texto };
  }
  return null;
}

/**
 * Un bloque del documento, de un encabezado al siguiente.
 *
 * Se corta por el encabezado siguiente y no por una cantidad de caracteres porque las
 * tablas del AIP no miden lo mismo en dos aeródromos: la de Ezeiza sigue en una segunda
 * página con un `(cont.)` y la de Mar del Plata entra en cinco renglones.
 */
function bloque(texto, desde, hasta) {
  const i = texto.indexOf(desde);
  if (i < 0) return null;
  const j = texto.indexOf(hasta, i + desde.length);
  return (j > i ? texto.slice(i, j) : texto.slice(i)).replace(/\n{3,}/g, "\n\n").trimEnd();
}

async function textoDelPdf(bytes) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function main() {
  const local = process.argv[2];
  fs.mkdirSync(SALIDA, { recursive: true });

  let html = null;
  if (!local) {
    console.log("Pidiendo el listado AD del AIP…");
    html = await listadoAd();
  } else {
    console.log(`Leyendo PDF de ${local}`);
  }

  const fuentes = [];

  for (const icao of AERODROMOS) {
    let bytes;
    let meta = { edicion: "", vigenteDesde: "", url: "" };

    if (local) {
      const archivo = path.join(local, `${icao}.pdf`);
      if (!fs.existsSync(archivo)) {
        console.error(`  ${icao}: falta ${archivo}`);
        continue;
      }
      bytes = fs.readFileSync(archivo);
      const sidecar = path.join(local, `${icao}.meta`);
      if (fs.existsSync(sidecar)) {
        const [edicion, vigenteDesde, url] = fs.readFileSync(sidecar, "utf8").trim().split("\t");
        meta = { edicion, vigenteDesde, url };
      }
    } else {
      const doc = documentoDe(html, icao);
      if (!doc) {
        console.error(`  ${icao}: no aparece en el listado AD`);
        continue;
      }
      meta = doc;
      const res = await fetch(doc.url, { headers: { "User-Agent": UA, Referer: `${BASE}/aip` } });
      if (!res.ok) {
        console.error(`  ${icao}: la descarga contestó ${res.status}`);
        continue;
      }
      bytes = Buffer.from(await res.arrayBuffer());
    }

    const texto = await textoDelPdf(bytes);
    const secciones = [
      ["AD 2.2", "AD 2.3"],
      ["AD 2.4", "AD 2.5"],
      ["AD 2.12", "AD 2.13"],
      ["AD 2.18", "AD 2.19"],
    ].map(([desde, hasta]) => [desde, bloque(texto, desde, hasta)]);

    const comunicaciones = secciones.find(([d]) => d === "AD 2.18")?.[1];
    if (!comunicaciones) {
      console.error(`  ${icao}: el PDF no trae AD 2.18`);
      continue;
    }

    const cabecera = [
      `# ${icao} — extraído de ${meta.url || "(PDF local)"}`,
      `# AIP ARGENTINA, AD 2.0 · edición ${meta.edicion || "?"} · vigente desde ${meta.vigenteDesde || "?"}`,
      `# Generado por scripts/build-aip.mjs. NO EDITAR A MANO: es la copia verbatim contra`,
      `# la que aip.test.ts contrasta src/data/aip-ad.tsv.`,
      "",
    ].join("\n");

    const cuerpo = secciones
      .map(([desde, texto]) => texto ?? `${desde} (no aparece en el documento)`)
      .join("\n\n");
    fs.writeFileSync(path.join(SALIDA, `${icao}.txt`), `${cabecera}${cuerpo}\n`);

    fuentes.push([icao, "AD 2.0", meta.edicion, meta.vigenteDesde, meta.url].join("\t"));
    const faltan = secciones.filter(([, t]) => !t).map(([d]) => d);
    console.log(
      `  ${icao}: ${meta.edicion} ${meta.vigenteDesde}` + (faltan.length ? `  (faltan ${faltan.join(", ")})` : "")
    );
  }

  fuentes.sort();
  fs.writeFileSync(FUENTES, fuentes.join("\n") + "\n");
  console.log(`\naip-fuentes.tsv: ${fuentes.length} documentos.`);
  console.log(`  Columnas: icao documento edicion vigenteDesde url`);
}

main();
