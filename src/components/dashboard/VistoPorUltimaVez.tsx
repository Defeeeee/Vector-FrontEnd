"use client";

import { useEffect, useState } from "react";
import { Archive } from "lucide-react";
import { CACHE_PAGINAS, HEADER_CAPTURA } from "@/lib/pwa";

/**
 * "Última vez que pudimos actualizar: jueves 14:20."
 *
 * ## Por qué la página lee el cache directamente
 *
 * Se descartaron las dos alternativas obvias.
 *
 * **Inyectar el timestamp en el HTML guardado** obliga al service worker a bufferear el
 * documento entero antes del primer byte —chau streaming— y mete un parser de HTML a
 * mano entre Next y el navegador. El día que Next cambie cómo emite su payload, eso se
 * rompe de una forma difícil de diagnosticar.
 *
 * **Preguntarle al service worker por `postMessage`** depende de que esté vivo, y el
 * service worker **se muere entre eventos**. La respuesta sería "no sé" — y "no sé"
 * degradando a "asumamos que está fresco" es exactamente lo que este proyecto prohíbe.
 *
 * El Cache API está disponible en `window`, no sólo en el worker. Se abre la caja y se
 * lee el header que el service worker estampó **al guardar**.
 *
 * ## Y por qué eso alcanza, que es la parte no obvia
 *
 * Con red primero **no hace falta saber si la página vino del cache**: las dos
 * respuestas posibles se distinguen solas.
 *
 * - Si vino de la red, el service worker acaba de reescribir la copia y su fecha es de
 *   hace segundos → por debajo del umbral, no se muestra nada.
 * - Si vino del cache, la fecha es de la última vez que hubo red → se muestra.
 * - Si no hay copia, no hay nada que decir, que es el comportamiento de siempre.
 *
 * El único modo de falla es callarse sobre una página de ocho segundos. **Falla del
 * lado seguro**, y no depende de que el worker esté despierto.
 */

/** Por debajo de esto la página es de recién y no hay nada que avisar. */
const UMBRAL_S = 20;

export default function VistoPorUltimaVez() {
  const [capturada, setCapturada] = useState<Date | null>(null);

  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        if (typeof caches === "undefined") return;
        const cache = await caches.open(CACHE_PAGINAS);
        /*
          `ignoreVary` porque Next sirve el HTML con `Vary: RSC,
          Next-Router-State-Tree, …`, y un `match` desde la página arma un pedido sin
          esos headers: sin esto no coincide nunca y el cartel no aparecería jamás.
          Es seguro acá — **no se usa el cuerpo, sólo la fecha del header**.
        */
        const guardada = await cache.match(window.location.href, { ignoreVary: true });
        const sello = guardada?.headers.get(HEADER_CAPTURA);
        if (!sello || !vivo) return;

        const cuando = new Date(sello);
        if (Number.isNaN(cuando.getTime())) return;
        if (Date.now() - cuando.getTime() < UMBRAL_S * 1000) return;
        setCapturada(cuando);
      } catch {
        // Safari en modo privado tira al tocar storage. Sin el cartel la pantalla
        // funciona igual; con una excepción no cargaría.
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  if (!capturada) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 mb-6">
      <Archive className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          Esto es una foto guardada en el teléfono
        </p>
        <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed mt-0.5">
          Última vez que pudimos actualizar:{" "}
          <span className="data font-semibold">{fechaLarga(capturada)}</span>. Puede haber
          vuelos cargados después.
        </p>
      </div>
    </div>
  );
}

/**
 * "viernes 21/08, 19:07".
 *
 * Fecha absoluta y no relativa: un "hace 3 h" obliga al piloto a hacer la cuenta justo
 * cuando menos ganas tiene. Y en **24 horas**, como todo el resto de la app — el
 * `es-AR` por defecto devuelve "07:07 p. m.", que además arrastra un punto final y
 * dejaba la frase terminando en "..".
 */
function fechaLarga(d: Date): string {
  const dia = d.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dia}, ${hora}`;
}
