"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PuntoMapa } from "@/components/dashboard/PlanMapaInner";
import { TILES_OPCIONES, TILES_URL } from "@/lib/mapa-tiles";

/**
 * El mapa chico del vuelo de una publicación: uno o dos aeródromos y la línea entre
 * ellos, con los mismos tiles que los otros mapas de la app (`lib/mapa-tiles.ts`). En
 * modo oscuro los tiles se invierten con un filtro, sólo en este mapa (`.mapa-oscuro`
 * en `globals.css`): OSM no tiene una versión oscura.
 *
 * **Quieto a propósito.** En un feed que se recorre con el dedo, un mapa que se puede
 * arrastrar o hacer zoom se come el scroll: el pulgar queda atrapado adentro. Sin
 * controles, sin arrastre, sin zoom, sin tooltips; es una ilustración, no una
 * herramienta. Para eso está el Planificador.
 */
export default function MiniMapaRutaInner({ puntos }: { puntos: PuntoMapa[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const oscuro = resolvedTheme === "dark";
  // El array cambia de identidad con cada render de la lista; lo que importa es dónde
  // están los puntos.
  const clave = puntos.map((p) => `${p.lat},${p.lon}`).join("|");

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor || puntos.length === 0) return;

    const mapa = L.map(contenedor, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.25,
    });
    // OSM exige la atribución visible (ver `lib/mapa-tiles.ts`).
    L.control.attribution({ prefix: false, position: "bottomright" }).addTo(mapa);
    L.tileLayer(TILES_URL, TILES_OPCIONES).addTo(mapa);

    const coords = puntos.map((p) => [p.lat, p.lon] as L.LatLngTuple);
    if (coords.length > 1) {
      L.polyline(coords, { color: "#0A84FF", weight: 3, opacity: 0.95, interactive: false }).addTo(mapa);
    }
    for (const c of coords) {
      L.circleMarker(c, {
        radius: 6,
        color: oscuro ? "#000000" : "#ffffff",
        weight: 2,
        fillColor: "#0A84FF",
        fillOpacity: 1,
        interactive: false,
      }).addTo(mapa);
    }

    // Un solo punto —un vuelo local— no tiene área: se centra a escala de la zona.
    if (coords.length === 1) mapa.setView(coords[0], 10);
    else mapa.fitBounds(L.latLngBounds(coords), { padding: [28, 28], maxZoom: 11 });

    return () => {
      mapa.remove();
    };
    // `clave` resume `puntos`: pasarle el array haría un mapa nuevo en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, oscuro]);

  return <div ref={contenedorRef} className={`absolute inset-0 ${oscuro ? "mapa-oscuro" : ""}`} />;
}
