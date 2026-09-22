import { Publicacion } from "@/types";
import { catalogoServidor } from "./catalogo-servidor";
import { resolverPunto } from "./resolucion-puntos";
import { parsearRuta } from "./ruta-planificada";

export function enriquecerPublicacionesConMapa(publicaciones: Publicacion[]): Publicacion[] {
  return publicaciones.map(pub => {
    if (!pub.vuelo || !pub.vuelo.ruta) return pub;
    const ruta = pub.vuelo.ruta;
    const codigos = parsearRuta(ruta);
    if (codigos.length === 0) return pub;

    const puntos_mapa = codigos.map(codigo => {
      const { punto } = resolverPunto(codigo, {}, catalogoServidor);
      if (punto) {
        return {
          codigo,
          label: punto.label || codigo,
          lat: punto.lat,
          lon: punto.lon
        };
      }
      return null;
    }).filter(Boolean) as { codigo: string; label: string; lat: number; lon: number }[];

    if (puntos_mapa.length > 0) {
      return {
        ...pub,
        vuelo: {
          ...pub.vuelo,
          puntos_mapa
        }
      };
    }
    
    return pub;
  });
}
