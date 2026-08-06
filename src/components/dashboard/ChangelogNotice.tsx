"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, MapPin, BookOpen, Compass, ChevronRight } from "lucide-react";
import Link from "next/link";

// Sólo va acá lo que el piloto efectivamente ve. La higiene de esta versión
// —el secreto fuera de la URL, el límite de mensajes, la retención— es
// importante pero no es una novedad que alguien quiera leer en su dashboard.
const CHANGELOG_VERSION = "v2.6.0";

export default function ChangelogNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `vector_dismissed_changelog_${CHANGELOG_VERSION}`;
    const dismissed = localStorage.getItem(key);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    const key = `vector_dismissed_changelog_${CHANGELOG_VERSION}`;
    localStorage.setItem(key, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="rounded-[2rem] border border-aviation-blue/20 bg-aviation-blue/[0.04] dark:bg-aviation-blue/[0.06] p-6 md:p-7 relative overflow-hidden transition-all shadow-sm">
      <button
        onClick={dismiss}
        type="button"
        className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-xl hover:bg-zinc-200/50 dark:hover:bg-white/10"
        title="Descartar novedades"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="p-2 rounded-xl bg-aviation-blue/10 text-aviation-blue">
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-aviation-blue">
          Novedades de la versión {CHANGELOG_VERSION}
        </span>
      </div>

      <h3 className="text-xl font-display font-bold text-zinc-900 dark:text-white tracking-tight mb-4">
        ¡Tu bitácora Vector sigue sumando herramientas!
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white text-xs font-bold">
            <Compass className="w-4 h-4 text-aviation-blue" />
            <span>Distancia de travesía</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Al cargar un vuelo ves las millas náuticas entre los dos aeródromos, calculadas
            con las coordenadas oficiales de ANAC.
          </p>
          <Link
            href="/dashboard/log-flight"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-aviation-blue hover:underline pt-1"
          >
            Cargar un vuelo <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white text-xs font-bold">
            <Sparkles className="w-4 h-4 text-aviation-blue" />
            <span>Descargá tus datos</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Todo lo que Vector guarda tuyo en un archivo: perfil, aeronaves, libros, vuelos,
            documentos, packs y transacciones. Es tuyo y te lo podés llevar.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-aviation-blue hover:underline pt-1"
          >
            Ir al Hangar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
