import { NextRequest, NextResponse } from "next/server";
import { getAirport, searchAirports } from "@/lib/airports";
import { getRadioayuda } from "@/lib/radioayudas";
import { clasificarToken, frecuencia, puntoPorRadial } from "@/lib/puntos";

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

export type ClasePunto = "aerodromo" | "radioayuda" | "coordenada" | "radial";

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
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ punto: null, sugerencias: [] });

  const token = clasificarToken(q);
  const cache = { headers: { "Cache-Control": "public, max-age=86400" } };

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

  // Un código: aeródromo primero, radioayuda después.
  const codigo = token.codigo;
  const sugerencias = searchAirports(codigo, 8);

  const aeropuerto = getAirport(codigo);
  if (aeropuerto?.lat !== undefined && aeropuerto?.lon !== undefined) {
    const punto: PuntoResuelto = {
      codigo,
      clase: "aerodromo",
      label: aeropuerto.label,
      lat: aeropuerto.lat,
      lon: aeropuerto.lon,
      variacionW: aeropuerto.variacionW,
      elevacionFt: aeropuerto.elevation,
      pistas: aeropuerto.pistas,
    };
    return NextResponse.json({ punto, sugerencias }, cache);
  }

  const estacion = getRadioayuda(codigo);
  if (estacion) {
    const punto: PuntoResuelto = {
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
    return NextResponse.json({ punto, sugerencias }, cache);
  }

  return NextResponse.json({ punto: null, sugerencias }, cache);
}
