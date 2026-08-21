/// <reference lib="webworker" />

import {
  CACHES_SIN_VERSION,
  CACHE_DATOS,
  CACHE_METEO,
  HEADER_CAPTURA,
  CACHE_SHELL,
  MENSAJES,
  PRECACHE,
  RUTA_PUNTOS,
  cachesABorrar,
  capturaVigente,
  estrategiaPara,
  topeMeteo,
} from "@/lib/pwa";
import { catalogoDesdeJson, type CatalogoSerializado } from "@/lib/catalogo-json";
import { resolverPunto } from "@/lib/resolucion-puntos";
import type { Catalogo } from "@/lib/catalogo";

/**
 * El service worker de Vector.
 *
 * **Fase 5: la meteorología se guarda, con la fecha a la vista.** Todavía no guarda
 * una sola página del dashboard: eso es la Fase 6, y viene atado al cartel que dice de
 * cuándo es lo que estás viendo.
 *
 * El orden no es casual: un service worker roto **no se arregla con un deploy**,
 * porque el que decide si se busca la versión nueva es el service worker viejo. Por
 * eso la Fase 1 verificó instalar, actualizar y poder matarlo antes de que tocara un
 * solo request, y por eso ahora empieza a intervenir sobre lo que no puede lastimar
 * a nadie: contenido inmutable y una pantalla que dice que no hay red.
 *
 * Lo que no va a haber nunca acá es una receta genérica que "hace lo razonable": las
 * reglas de este proyecto no son las razonables por defecto.
 *
 * ## Dónde vive el criterio
 *
 * En `src/lib/pwa.ts`, no acá. Este archivo no se puede testear —`vitest` corre en
 * `environment: "node"`— así que todo lo que sea una decisión se toma allá, donde
 * hay tests, y acá queda la plomería. Es la misma jugada que parió `briefing.ts`.
 */

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (evento) => {
  /*
    Se traen por adelantado sólo las cosas que el piloto puede no haber visitado
    nunca —la pantalla de respaldo— y las que el sistema operativo puede pedir en
    cualquier momento —los íconos—. Los assets de la app **no** están en esa lista:
    llevan el hash en la URL, así que se guardan solos la primera vez que se piden.

    Si algo del precache falla, la instalación falla entera y se reintenta después.
    Es lo correcto: un shell a medias es peor que ninguno, porque la app quedaría
    "disponible sin conexión" sin estarlo.
  */
  evento.waitUntil(caches.open(CACHE_SHELL).then((cache) => cache.addAll(PRECACHE)));

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

/**
 * Cache primero. **Sólo para contenido que no puede cambiar sin cambiar de URL.**
 *
 * Sin revalidar y sin fecha de vencimiento, que en cualquier otro caso sería
 * imprudente y acá es exacto: `/_next/static/**` lleva el hash adentro del nombre, y
 * lo del precache se renueva junto con la versión del cache.
 */
async function delCacheODeLaRed(pedido: Request): Promise<Response> {
  const cache = await caches.open(CACHE_SHELL);
  const guardado = await cache.match(pedido);
  if (guardado) return guardado;

  const respuesta = await fetch(pedido);
  // **Sólo 200.** Un 404 o un 503 guardado envenena el cache hasta la próxima
  // versión, y se vería como una app rota que ningún deploy arregla.
  if (respuesta.ok && respuesta.status === 200) {
    await cache.put(pedido, respuesta.clone());
  }
  return respuesta;
}

/**
 * A la red, y si falla de verdad, la pantalla de sin conexión.
 *
 * **No hay carrera contra reloj acá, y es a propósito.** Se espera a que el pedido
 * falle de verdad. La carrera de 3 s que hace falta para la señal que engancha y no
 * transfiere viene en la Fase 6, junto con su mitigación — el canje del refresh
 * token de Supabase es de un solo uso, y abandonar una navegación a mitad de camino
 * puede quemarlo y dejar al piloto tipeando la contraseña en la plataforma.
 * Adelantar la carrera sin eso sería adelantar el riesgo sin ninguna de sus ventajas.
 */
async function deLaRedOSinConexion(pedido: Request): Promise<Response> {
  try {
    /*
      Se pasa el `Request` original, sin tocarlo. Una navegación viene con
      `redirect: "manual"`, y la respuesta a un redirect es opaca: no se puede leer,
      no se puede cachear, pero **sí se puede devolver tal cual** y el navegador la
      sigue. Rearmar el pedido con `redirect: "follow"` haría que el navegador tire
      `TypeError` al recibir una respuesta ya redirigida, y la página no cargaría.

      Es también lo que hace imposible confundir "tu sesión venció" con "acá está tu
      dashboard": el service worker no puede leer el destino, así que no puede
      elegir mal.
    */
    return await fetch(pedido);
  } catch {
    const respaldo = await caches.match("/sin-conexion", { cacheName: CACHE_SHELL });
    if (respaldo) return respaldo;
    // Sin respaldo tampoco hay nada que inventar: se deja que el navegador muestre
    // su propio error, que es lo que pasaba antes de todo esto.
    throw new Error("sin conexión y sin pantalla de respaldo");
  }
}

/**
 * El catálogo de a bordo, armado una sola vez por vida del worker.
 *
 * **La memoización importa más acá que en el servidor.** El service worker se duerme y
 * despierta todo el tiempo, y `JSON.parse` de 153 KB en cada tecla del autocompletado
 * se sentiría al tipear una ruta.
 */
let catalogoBordo: Catalogo | null = null;

async function catalogoDeBordo(): Promise<Catalogo | null> {
  if (catalogoBordo) return catalogoBordo;
  try {
    const guardado = await caches.match("/catalogo-aeronautico.json", { cacheName: CACHE_SHELL });
    const respuesta = guardado ?? (await fetch("/catalogo-aeronautico.json"));
    catalogoBordo = catalogoDesdeJson((await respuesta.json()) as CatalogoSerializado);
    return catalogoBordo;
  } catch {
    // Sin catálogo no se inventa nada: el pedido falla como fallaba antes, y el
    // planificador muestra que no pudo resolver el punto.
    return null;
  }
}

/**
 * Datos aeronáuticos: se contesta con lo guardado y se refresca atrás.
 *
 * El ciclo AIRAC es de 28 días, así que servir la respuesta de ayer mientras llega la
 * de hoy no cuesta nada — y sí cuesta esperar la red en cada tecla del autocompletado.
 */
async function guardadoYRefrescar(pedido: Request): Promise<Response> {
  const cache = await caches.open(CACHE_DATOS);
  const guardado = await cache.match(pedido);

  const red = fetch(pedido)
    .then(async (respuesta) => {
      if (respuesta.status === 200) await cache.put(pedido, respuesta.clone());
      return respuesta;
    })
    .catch(() => null);

  if (guardado) {
    // El refresco sigue solo. `waitUntil` no está disponible acá, pero la promesa
    // queda viva mientras el worker lo esté, que alcanza para el caso normal.
    void red;
    return guardado;
  }

  const respuesta = await red;
  if (respuesta) return respuesta;

  return (await resolverConCatalogoLocal(pedido)) ?? Response.error();
}

/**
 * Lo que hace que el planificador funcione sin señal.
 *
 * Cuando `/api/puntos` no se puede alcanzar y no hay nada guardado para esa consulta,
 * el service worker resuelve el punto **con el mismo algoritmo que el servidor**
 * —`resolverPunto`— contra el catálogo precacheado.
 *
 * ## Por qué acá y no en el componente
 *
 * Porque así **no hay que tocar un solo llamador**. Es el mismo argumento que ya ganó
 * una vez en este repo: el 503 sintético de `apiFetch` fluye por caminos que ya
 * estaban escritos. `PuntoResolver` y `PlanificadorClient` no se enteran de nada, y el
 * próximo consumidor tampoco va a tener que acordarse.
 *
 * La respuesta lleva `offline: true` en el cuerpo —la misma convención que usa
 * `apiFetch`— para que la pantalla pueda decir con qué resolvió.
 */
async function resolverConCatalogoLocal(pedido: Request): Promise<Response | null> {
  const url = new URL(pedido.url);
  if (url.pathname !== RUTA_PUNTOS) return null;

  const catalogo = await catalogoDeBordo();
  if (!catalogo) return null;

  const resolucion = resolverPunto(
    url.searchParams.get("q") ?? "",
    { desde: url.searchParams.get("desde") ?? "", hasta: url.searchParams.get("hasta") ?? "" },
    catalogo
  );

  return new Response(JSON.stringify({ ...resolucion, offline: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Vector-Origen": "catalogo-local" },
  });
}

/**
 * Meteorología: la red manda, y lo guardado sólo si no pasó su tope.
 *
 * **Nunca cache primero.** Un METAR guardado no es un dato más rápido: es un dato de
 * antes, y la diferencia importa justo cuando el piloto está decidiendo pista en uso.
 * Se va a la red, y sólo si no contesta se mira lo que hay — y aun así se descarta si
 * lleva más tiempo guardado que el tope de esa ruta.
 *
 * La respuesta guardada lleva estampada `X-Vector-Capturado-En`, que contesta una
 * pregunta distinta de la del METAR: **cuándo lo trajimos**, no cuándo se observó. Las
 * dos importan, y `lib/frescura.ts` se encarga de la segunda leyendo el propio texto
 * del METAR.
 */
async function redOMeteoGuardada(pedido: Request, maximoMin: number): Promise<Response> {
  const cache = await caches.open(CACHE_METEO);

  try {
    const respuesta = await fetch(pedido);
    if (respuesta.status === 200) {
      const copia = respuesta.clone();
      const cabeceras = new Headers(copia.headers);
      cabeceras.set(HEADER_CAPTURA, new Date().toISOString());
      await cache.put(pedido, new Response(await copia.blob(), { status: 200, headers: cabeceras }));
    }
    return respuesta;
  } catch {
    const guardado = await cache.match(pedido);
    if (guardado && capturaVigente(guardado.headers.get(HEADER_CAPTURA), maximoMin, new Date())) {
      return guardado;
    }
    /*
      Vencido o sin fecha: **se borra y se deja fallar**. Servir un METAR de seis horas
      no es servir un dato viejo, es servir un dato falso con formato de dato — y la
      pantalla ya sabe decir "no pudimos traer el METAR", que es la respuesta honesta.
    */
    if (guardado) await cache.delete(pedido);
    throw new Error("sin meteorología reciente");
  }
}

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  const estrategia = estrategiaPara(
    {
      metodo: pedido.method,
      url: pedido.url,
      modo: pedido.mode,
      // `next/link` navega pidiendo el árbol de React en vez de HTML. Ver la
      // explicación en `estrategiaPara`.
      esRSC: pedido.headers.has("RSC") || pedido.headers.has("Next-Router-Prefetch"),
    },
    self.location.origin
  );

  // `ignorar` es **no llamar a `respondWith`**, no llamarlo con un `fetch` de
  // vuelta: así el navegador resuelve el pedido por su cuenta, con todo lo que eso
  // implica —streaming, prioridades, `Vary`— en vez de por un camino nuestro que lo
  // imita peor.
  if (estrategia === "ignorar") return;

  if (estrategia === "assets") return evento.respondWith(delCacheODeLaRed(pedido));
  if (estrategia === "datos") return evento.respondWith(guardadoYRefrescar(pedido));
  if (estrategia === "meteo") {
    const tope = topeMeteo(new URL(pedido.url).pathname);
    return evento.respondWith(redOMeteoGuardada(pedido, tope ?? 0));
  }
  evento.respondWith(deLaRedOSinConexion(pedido));
});
