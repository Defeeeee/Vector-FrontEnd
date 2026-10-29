"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, Download } from "lucide-react";
import PasoMarcador from "@/components/dashboard/MarcadorCad";

/**
 * El paso 1 de "Pasar al CAD": la extensión "Vector → CAD" (`extension/`, 2026-10-29), o el
 * marcador para quien no la quiera. La extensión pone un botón fijo en el CAD que carga el
 * mismo panel que el marcador, así que el resto de los pasos no cambia.
 *
 * Instalada, la extensión deja `data-vector-cad-extension` en `<html>` (`extension/vector.js`).
 * Se lee después de montar: el server no lo sabe.
 *
 * Todavía no está en la Chrome Web Store: se carga descomprimida, en modo de desarrollador.
 */
export default function PasoExtension() {
  const [instalada, setInstalada] = useState<string | null>(null);
  const [marcador, setMarcador] = useState(false);
  useEffect(() => {
    setInstalada(document.documentElement.dataset.vectorCadExtension ?? null);
  }, []);

  if (instalada) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        <Check className="w-4 h-4" aria-hidden="true" /> Ya tenés la extensión de Vector
      </p>
    );
  }

  if (marcador) {
    return (
      <div className="space-y-4">
        <PasoMarcador />
        <button onClick={() => setMarcador(false)} className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
          Mejor la extensión
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-prose">
        La extensión pone un botón <b className="font-semibold text-zinc-900 dark:text-white">Pasar con Vector</b> adentro del CAD. Los vuelos se cargan
        desde tu sesión del CAD, en tu navegador: Vector nunca ve tu contraseña y la extensión no pide ningún permiso. Anda en Chrome, Edge y Brave, en la
        compu.
      </p>
      <a
        href="/cad/vector-cad.zip"
        download
        className="inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold"
      >
        <Download className="w-4 h-4" aria-hidden="true" /> Bajar la extensión
      </a>
      <ol className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed list-decimal pl-5 max-w-prose">
        <li>Descomprimí el archivo: queda una carpeta <span className="font-mono text-[13px]">vector-cad</span>.</li>
        <li>
          Abrí <span className="font-mono text-[13px]">chrome://extensions</span> y prendé el <b className="font-semibold text-zinc-900 dark:text-white">Modo de desarrollador</b>, arriba a la derecha.
        </li>
        <li>
          Tocá <b className="font-semibold text-zinc-900 dark:text-white">Cargar descomprimida</b> y elegí la carpeta. Después recargá esta página.
        </li>
      </ol>
      <button
        onClick={() => setMarcador(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
      >
        <Bookmark className="w-4 h-4" aria-hidden="true" /> Prefiero el marcador
      </button>
    </div>
  );
}
