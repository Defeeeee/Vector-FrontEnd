"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, MapPin, BookOpen, Compass, ChevronRight } from "lucide-react";
import Link from "next/link";

const CHANGELOG_VERSION = "v2.5.0";

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

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white text-xs font-bold">
            <Compass className="w-4 h-4 text-aviation-blue" />
            <span>Mapa Geográfico de Rutas</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Visualizá tu red de vuelos en el mapa interactivo dentro del Resumen de horas.
          </p>
          <Link
            href="/dashboard/summary"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-aviation-blue hover:underline pt-1"
          >
            Ver mapa <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white text-xs font-bold">
            <MapPin className="w-4 h-4 text-aviation-blue" />
            <span>Dataset ANAC MADHEL</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            711 aeródromos y helipuertos argentinos con códigos locales (GEZ, SRDR, MOR).
          </p>
          <Link
            href="/dashboard/airports"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-aviation-blue hover:underline pt-1"
          >
            Explorar campos <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white text-xs font-bold">
            <BookOpen className="w-4 h-4 text-aviation-blue" />
            <span>Múltiples Libros de Vuelo</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Creá libros por trabajo o proyecto con saldo de horas inicial sin transcribir a mano.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-aviation-blue hover:underline pt-1"
          >
            Gestionar libros <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
