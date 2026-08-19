import { NextRequest, NextResponse } from "next/server";
import { expandirAerovias, parsearRuta } from "@/lib/ruta-planificada";
import { puntosDeAerovia } from "@/lib/aerovias";
import { fuenteAip } from "@/lib/aip";

/**
 * GET /api/ruta?q=SADM+ALBAL+UM424+EZE+SAZS
 *
 * Expande las aerovías de una ruta y devuelve la lista de puntos.
 *
 * ## Por qué es un endpoint aparte y no parte de `/api/puntos`
 *
 * Porque una aerovía **no se resuelve sola**: necesita el punto de antes y el de después.
 * `/api/puntos` contesta por token, que es lo correcto para un campo que se completa
 * mientras se tipea; esto contesta por ruta entera, y se llama cuando la ruta se fija —al
 * pegarla o al abrir un link—, no en cada tecla.
 *
 * ## Devuelve el error en castellano y sin puntos
 *
 * Cuando la expansión no se puede hacer, no manda una ruta a medias: manda la explicación
 * de qué falta. Una aerovía expandida por la mitad es una travesía más corta que la real
 * y con pinta de válida — el modo de falla que este endpoint existe para no tener.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ puntos: [], expandidas: [], error: null });

  const { puntos, expandidas, error } = expandirAerovias(parsearRuta(q), puntosDeAerovia);
  const fuente = expandidas.length ? fuenteAip("ENR3.1") : null;

  return NextResponse.json(
    {
      puntos,
      expandidas,
      error,
      vigencia: fuente
        ? { documento: "ENR 3", edicion: fuente.edicion, vigenteDesde: fuente.vigenteDesde, url: fuente.url }
        : null,
    },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
}
