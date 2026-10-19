"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { AerodromoForm } from "@/lib/formulario-plan";

interface Resultado {
  icao: string;
  name: string;
  label: string;
  city?: string;
  lat?: number;
  lon?: number;
}

/**
 * Un aeródromo del plan: por código (`SADF`, `CNL`) o por nombre ("martin garcia"), con
 * la búsqueda de siempre (`/api/airports/search`, que lee MADHEL y OurAirports). Elegido,
 * queda el código, el nombre y las coordenadas, que hacen falta para DEP/ y DEST/ cuando
 * el aeródromo no tiene OACI y para sugerir la duración.
 */
export default function CampoAerodromo({
  valor,
  onCambio,
  placeholder,
  claseInput,
}: {
  valor: AerodromoForm | null;
  onCambio: (a: AerodromoForm | null) => void;
  placeholder: string;
  claseInput: string;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [abierto, setAbierto] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setResultados([]);
      return;
    }
    const n = ++pedido.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}&limit=6`);
        const data = (await res.json()) as { results?: Resultado[] };
        if (n === pedido.current) setResultados(data.results ?? []);
      } catch {
        if (n === pedido.current) setResultados([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [texto]);

  const elegir = (r: Resultado) => {
    onCambio({ codigo: r.icao, nombre: r.label || r.name, lat: r.lat, lon: r.lon });
    setTexto("");
    setResultados([]);
    setAbierto(false);
  };

  if (valor) {
    return (
      <div className="flex items-center gap-2">
        <span className={`${claseInput} flex items-baseline gap-2`}>
          <span className="data font-bold">{valor.codigo}</span>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">{valor.nombre}</span>
        </span>
        <button
          type="button"
          aria-label="Cambiar aeródromo"
          onClick={() => onCambio(null)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && resultados[0]) {
            e.preventDefault();
            elegir(resultados[0]);
          }
        }}
        placeholder={placeholder}
        className={`${claseInput} uppercase placeholder:normal-case`}
        autoComplete="off"
      />
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          {resultados.map((r) => (
            <li key={r.icao}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-white/5 flex items-baseline gap-3"
              >
                <span className="data text-sm font-bold text-zinc-900 dark:text-white w-12 shrink-0">{r.icao}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{r.label || r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
