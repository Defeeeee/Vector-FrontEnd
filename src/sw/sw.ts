/// <reference lib="webworker" />

import { CACHES_SIN_VERSION, CACHE_SHELL, MENSAJES, cachesABorrar } from "@/lib/pwa";

/**
 * El service worker de Vector.
 *
 * **Fase 1: no intercepta nada.** Se instala, se actualiza, se puede matar, y el
 * `fetch` está pero no hace nada. Es deliberado, y el orden importa: un service
 * worker roto **no se arregla con un deploy**, porque el que decide si se busca la
 * versión nueva es el service worker viejo. Antes de que toque un solo request hay
 * que haber verificado en un teléfono de verdad que se instala, que se actualiza y
 * que se puede desinstalar a la fuerza.
 *
 * Las fases siguientes le agregan estrategias de cache **acá adentro**, y cada regla
 * con su comentario. Lo que no va a haber es una receta genérica que "hace lo
 * razonable": las reglas de este proyecto no son las razonables por defecto.
 *
 * ## Dónde vive el criterio
 *
 * En `src/lib/pwa.ts`, no acá. Este archivo no se puede testear —`vitest` corre en
 * `environment: "node"`— así que todo lo que sea una decisión se toma allá, donde
 * hay tests, y acá queda la plomería. Es la misma jugada que parió `briefing.ts`.
 */

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => {
  /*
    **No se llama a `skipWaiting()` acá, y es la decisión de esta fase.**

    Activar una versión nueva debajo de una pestaña que ya está abierta le cambia el
    precache abajo de los pies: el próximo chunk perezoso que pida —el mapa de
    Leaflet, los gráficos— puede no existir más y tirar `ChunkLoadError` en la cara
    del piloto. Así que el service worker nuevo **espera**, la app se entera y
    pregunta, y recién ahí se activa. Ver `MENSAJES.activarAhora`.
  */
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const existentes = await caches.keys();
      await Promise.all(cachesABorrar(existentes, CACHE_SHELL).map((n) => caches.delete(n)));

      /*
        `clients.claim()` hace que esta versión tome el control de las pestañas que ya
        están abiertas sin esperar a que naveguen. Es seguro **acá** —a diferencia de
        `skipWaiting`— porque para llegar a `activate` ya pasó por la puerta de arriba:
        o es la primera instalación, o el piloto aceptó la versión nueva.
      */
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (evento) => {
  const tipo = (evento.data as { tipo?: string } | null)?.tipo;

  if (tipo === MENSAJES.activarAhora) {
    self.skipWaiting();
    return;
  }

  if (tipo === MENSAJES.autodestruir) {
    /*
      **La vía de escape, y va en la primera versión a propósito.**

      Si algo de esto sale mal, el service worker viejo se queda sirviendo una app
      vieja y no hay deploy que lo saque: es él quien decide si busca la versión
      nueva. Agregar el botón de pánico después es tarde por definición.

      Borra todo —incluidos los caches sin versión, que en cualquier otro camino se
      respetan— y se desregistra. Después la página recarga y el navegador vuelve a
      hablar con el servidor como si el service worker nunca hubiera existido.
    */
    evento.waitUntil(
      (async () => {
        const todos = await caches.keys();
        await Promise.all(todos.map((n) => caches.delete(n)));
        await self.registration.unregister();
        const pestañas = await self.clients.matchAll({ type: "window" });
        for (const pestaña of pestañas) {
          if ("navigate" in pestaña) await (pestaña as WindowClient).navigate("/");
        }
      })()
    );
    return;
  }

  if (tipo === MENSAJES.olvidarDatosPersonales) {
    /*
      Todavía no hay nada personal guardado —esta fase no cachea— pero el mensaje
      existe desde el principio para que el camino esté probado antes de que haya
      algo que perder. Se contesta por el puerto que mandó el mensaje: quien pide
      esto está por cerrar sesión y necesita saber que terminó.
    */
    evento.waitUntil(
      (async () => {
        await Promise.all(CACHES_SIN_VERSION.map((n) => caches.delete(n)));
        evento.ports[0]?.postMessage({ ok: true });
      })()
    );
  }
});

/*
  El `fetch` está declarado y **vacío a propósito**.

  Sin llamar a `respondWith`, el navegador resuelve el pedido exactamente como si no
  hubiera service worker: esta fase no cambia el comportamiento de la app en nada. Y
  la declaración hace falta igual, porque los navegadores piden que exista un
  manejador de `fetch` para considerar la app instalable.

  Acá enganchan las estrategias de las fases siguientes.
*/
self.addEventListener("fetch", () => {});
