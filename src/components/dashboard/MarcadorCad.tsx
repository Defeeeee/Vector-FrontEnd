"use client";

import { useEffect, useRef } from "react";
import { Bookmark } from "lucide-react";

/**
 * El marcador "Vector → CAD" para arrastrar a la barra de favoritos: un `javascript:` que,
 * tocado en la pestaña del CAD, carga `/cad/puente.js` de Vector (`src/cad/puente.ts`).
 *
 * El `href` se pone después de montar: React bloquea los `javascript:` en las props, y así
 * además sale con el origen real (el de producción, o el local cuando se prueba).
 */
export default function MarcadorCad() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const codigo = `javascript:(function(){var s=document.createElement('script');s.src='${window.location.origin}/cad/puente.js?t='+Date.now();document.body.appendChild(s);})();`;
    ref.current?.setAttribute("href", codigo);
  }, []);
  return (
    <a
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        alert('Arrastrá este botón a la barra de favoritos. Después, tocalo en la pestaña del CAD, adentro de "Registro horas vuelo".');
      }}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold cursor-grab active:cursor-grabbing select-none"
      title="Arrastrame a la barra de favoritos"
    >
      <Bookmark className="w-4 h-4" /> Vector → CAD
    </a>
  );
}
