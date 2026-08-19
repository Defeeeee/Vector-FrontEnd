import { NextRequest, NextResponse } from "next/server";
import { getAirport, searchAirports } from "@/lib/airports";
import { getRadioayuda } from "@/lib/radioayudas";
import { buscarFixes, getFix } from "@/lib/fixes";
import { puntosDeAerovia } from "@/lib/aerovias";
import { esAerovia, tramoDeAerovia } from "@/lib/ruta-planificada";
import { fuenteAip } from "@/lib/aip";
import { clasificarToken, frecuencia, puntoPorRadial } from "@/lib/puntos";
import type { ClasePunto } from "@/lib/ruta-planificada";

/**
 * GET /api/puntos?q=SADM · ?q=BAR/045/25 · ?q=S34.68/W58.64
 *
 * Resuelve **un punto de una ruta**, que ya no es sólo un aeródromo.
 *
 * Devuelve `{ punto, sugerencias }`: el punto resuelto —o `null`— y, cuando el token es
 * un código, las mismas sugerencias que daba `/api/airports/search`, para que el campo
 * siga autocompletando mientras se tipea.
 *
 * ## Precedencia: el aeródromo primero
 *
 * `BAR` resuelve **Bariloche aeródromo**, no el VOR de Bariloche, y no es una elección
 * arbitraria: 77 de los 96 idents de radioayuda son también código de aeródromo —el VOR
 * se llama como el campo al que sirve—, la mediana de distancia entre los dos es de
 * 0,34 NM y el peor caso son 4 NM. El aeródromo trae pistas, elevación y METAR; la
 * estación no trae nada de eso. Y sobre todo: **así se comporta hoy**, con lo cual esto
 * no le cambia el resultado a ninguna ruta ya escrita.
 *
 * La radioayuda entra sólo cuando el código no es ningún aeródromo.
 *
 * ## El radial va contra la estación, siempre
 *
 * `BAR/045/25` no consulta el directorio de aeródromos ni por asomo. Necesita dos cosas
 * que sólo tiene la estación: su **posición exacta** —no la del campo a 1,5 NM— y su
 * **variación de alineación**, que es a la que están referidos sus radiales y que no es
 * la variación de hoy ni la del aeródromo.
 *
 * ## Los puntos que no son aeródromo no traen variación
 *
 * Ni la coordenada propia ni el punto por radial devuelven `variacionW`, y es a
 * propósito. La variación de un punto cualquiera sale del WMM, que en este proyecto es
 * una `devDependency` que corre en el build y **no existe en producción** — la decisión
 * está escrita en `scripts/build-magvar.mjs`. Devolver la variación de la estación en su
 * lugar sería peor que no devolver nada: es de 2007 y es la de la alineación, no la del
 * terreno. El plan usa una sola variación, la de salida, y esos puntos simplemente no
 * opinan.
 */

/**
 * La clase vive en `lib/ruta-planificada.ts` y acá se reexporta.
 *
 * Estaba declarada en los dos lados, y **se desincronizó apenas entraron los fixes**: la
 * pantalla no compilaba porque una de las dos no conocía `"fix"`. Un tipo duplicado sólo
 * avisa cuando alguien lo toca; que avise es suerte.
 */
export type { ClasePunto };

export interface PuntoResuelto {
  /** El token tal como se tipeó, normalizado. Es lo que vuelve a la URL. */
  codigo: string;
  clase: ClasePunto;
  label: string;
  lat: number;
  lon: number;
  variacionW?: number;
  elevacionFt?: number;
  pistas?: { le: string; he: string; rumboT: number; largoFt?: number; superficie?: string; fuente?: "medida" | "estimada" }[];
  /** Qué sintonizar. Sólo en los puntos que nacen de una radioayuda. */
  estacion?: { ident: string; tipo: string; nombre: string; frecuencia: string | null };
  /** Las aerovías del punto significativo: `W67-SID BCA`. Sólo en los `fix`. */
  rutas?: string;
  /**
   * Los puntos que aporta una aerovía, ya resueltos y en orden. Sólo en `clase: "aerovia"`.
   *
   * **No incluye el punto de entrada**, que ya está en la ruta: repetirlo daría un tramo
   * de cero millas en el medio de la planilla.
   */
  tramo?: PuntoResuelto[];
  /**
   * De cuándo es el dato, cuando sale del AIP. El AIP se enmienda cada 28 días, así que
   * un punto de aerovía sin fecha obliga al piloto a suponer que está vigente.
   */
  vigencia?: { documento: string; edicion: string; vigenteDesde: string; url: string };
}

/**
 * Un código a un punto: **aeródromo, radioayuda, punto significativo**, en ese orden.
 *
 * El orden importa sólo en el primer escalón —`BAR` es Bariloche aeródromo y no el VOR,
 * ver arriba—; entre radioayuda y fix no hay competencia posible: los idents de radioayuda
 * tienen tres caracteres como máximo y los designadores de fix son **exactamente cinco**.
 * Está verificado contra los catálogos reales en `fixes.test.ts`, no razonado.
 *
 * Vive como función aparte porque la usan dos caminos: el token que el piloto escribe y
 * cada punto que aporta una aerovía. Cuando eso estaba escrito dos veces —era el caso de
 * la composición de la ficha de aeródromo— las dos copias terminaron distintas.
 */
function resolverCodigo(codigo: string): PuntoResuelto | null {
  const aeropuerto = getAirport(codigo);
  if (aeropuerto?.lat !== undefined && aeropuerto?.lon !== undefined) {
    return {
      codigo,
      clase: "aerodromo",
      label: aeropuerto.label,
      lat: aeropuerto.lat,
      lon: aeropuerto.lon,
      variacionW: aeropuerto.variacionW,
      elevacionFt: aeropuerto.elevation,
      pistas: aeropuerto.pistas,
    };
  }

  const estacion = getRadioayuda(codigo);
  if (estacion) {
    return {
      codigo,
      clase: "radioayuda",
      label: estacion.nombre,
      lat: estacion.lat,
      lon: estacion.lon,
      estacion: {
        ident: estacion.ident,
        tipo: estacion.tipo,
        nombre: estacion.nombre,
        frecuencia: frecuencia(estacion.khz, estacion.tipo),
      },
    };
  }

  const fix = getFix(codigo);
  if (fix) {
    const fuente = fuenteAip("ENR4.4");
    return {
      codigo,
      clase: "fix",
      // El designador **es** el nombre: un fix no tiene otro. Se muestran las aerovías al
      // lado, que es lo que le dice al piloto dónde está parado.
      label: fix.rutas || "Punto significativo",
      lat: fix.lat,
      lon: fix.lon,
      rutas: fix.rutas,
      vigencia: fuente
        ? { documento: "ENR 4.4", edicion: fuente.edicion, vigenteDesde: fuente.vigenteDesde, url: fuente.url }
        : undefined,
    };
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ punto: null, sugerencias: [] });

  const cache = { headers: { "Cache-Control": "public, max-age=86400" } };

  /*
    Una aerovía es el único token que **no se resuelve solo**: necesita saber por dónde se
    entra y por dónde se sale. Los manda el planificador, que es quien conoce los vecinos
    del token en la ruta.
  */
  const desde = (searchParams.get("desde") ?? "").trim().toUpperCase();
  const hasta = (searchParams.get("hasta") ?? "").trim().toUpperCase();
  if (esAerovia(q)) {
    const secuencia = puntosDeAerovia(q);
    if (!secuencia) return NextResponse.json({ punto: null, sugerencias: [], error: null }, cache);

    const { puntos, error } = tramoDeAerovia(secuencia, desde, hasta, q);
    if (error) return NextResponse.json({ punto: null, sugerencias: [], error }, cache);

    // Cada punto del tramo se resuelve como cualquier otro. Si alguno no resolviera, la
    // aerovía no se publicaría — lo garantiza `aerovias.test.ts` — así que esto no
    // silencia nada: sólo evita un `null` que rompería la planilla entera.
    const tramo = puntos.map((p) => resolverCodigo(p)).filter((p): p is PuntoResuelto => p !== null);
    if (tramo.length !== puntos.length) {
      return NextResponse.json(
        { punto: null, sugerencias: [], error: `No pudimos ubicar todos los puntos de ${q}.` },
        cache
      );
    }

    /*
      La posición nominal de la aerovía es la de su punto de salida: es donde deja al
      avión. **No se toma del último punto del tramo**, y eso es lo que arregla el caso
      contiguo: `W67` de BCA a AKNOS no tiene ningún punto en el medio, el tramo viene
      vacío y leer `tramo[tramo.length - 1].lat` reventaba con un 500. La ruta se quedaba
      sin calcular y en la pantalla no había ninguna pista de por qué.
    */
    const salida = resolverCodigo(hasta);
    if (!salida) {
      return NextResponse.json({ punto: null, sugerencias: [], error: `No pudimos ubicar ${hasta}.` }, cache);
    }

    const fuente = fuenteAip("ENR3.1");
    const punto: PuntoResuelto = {
      codigo: q,
      clase: "aerovia",
      label: `vía ${q}`,
      lat: salida.lat,
      lon: salida.lon,
      tramo,
      vigencia: fuente
        ? { documento: "ENR 3", edicion: fuente.edicion, vigenteDesde: fuente.vigenteDesde, url: fuente.url }
        : undefined,
    };
    /*
      La salida viaja aparte porque **la banda se come su casillero**: el punto de salida se
      elige en el desplegable de la aerovía y no tiene campo propio, así que nadie lo
      resolvía y la planilla se quedaba sin calcular sin decir por qué. Se manda ya resuelto
      para que el planificador lo guarde en su lugar de la ruta.
    */
    return NextResponse.json({ punto, salida, sugerencias: [], error: null }, cache);
  }

  const token = clasificarToken(q);
  if (!token) return NextResponse.json({ punto: null, sugerencias: [] }, cache);

  if (token.tipo === "coordenada") {
    const punto: PuntoResuelto = {
      codigo: token.canonico,
      clase: "coordenada",
      label: token.etiqueta,
      lat: token.lat,
      lon: token.lon,
    };
    return NextResponse.json({ punto, sugerencias: [] }, cache);
  }

  if (token.tipo === "radial") {
    const estacion = getRadioayuda(token.estacion);
    if (!estacion) return NextResponse.json({ punto: null, sugerencias: [] }, cache);

    const p = puntoPorRadial(estacion, token.radial, token.distanciaNm);
    // `null` cuando la estación no publica su variación. No se supone cero: ver
    // `lib/puntos.ts`.
    if (!p) return NextResponse.json({ punto: null, sugerencias: [] }, cache);

    const punto: PuntoResuelto = {
      codigo: token.canonico,
      clase: "radial",
      label: token.etiqueta,
      lat: p.lat,
      lon: p.lon,
      estacion: {
        ident: estacion.ident,
        tipo: estacion.tipo,
        nombre: estacion.nombre,
        frecuencia: frecuencia(estacion.khz, estacion.tipo),
      },
    };
    return NextResponse.json({ punto, sugerencias: [] }, cache);
  }

  const codigo = token.codigo;
  const sugerencias = searchAirports(codigo, 8);

  const punto = resolverCodigo(codigo);
  if (punto) return NextResponse.json({ punto, sugerencias }, cache);

  /*
    Sin resolver. Las sugerencias suman los fixes que empiezan igual: alguien que escribió
    `DOR` a lo mejor va a `DORVO`, y sin esto no tendría forma de descubrirlo — un
    designador de cinco letras no se adivina.
  */
  const porPrefijo = buscarFixes(codigo, 6).map((f) => ({
    icao: f.designador,
    name: f.designador,
    city: "",
    country: "AR",
    size: "S" as const,
    iata: "",
    label: f.rutas || "Punto significativo",
    lat: f.lat,
    lon: f.lon,
  }));

  return NextResponse.json({ punto: null, sugerencias: [...sugerencias, ...porPrefijo] }, cache);
}
