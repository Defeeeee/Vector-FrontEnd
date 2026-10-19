"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { AerodromoForm } from "@/lib/formulario-plan";

interface Resultado {
  icao: string;
  country?: string;
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
  alinear = "izquierda",
}: {
  valor: AerodromoForm | null;
  onCambio: (a: AerodromoForm | null) => void;
  placeholder: string;
  claseInput: string;
  /** Hacia dónde se abre la lista: la del campo de la derecha se abre hacia la izquierda. */
  alinear?: "izquierda" | "derecha";
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
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}&limit=12`);
        const data = (await res.json()) as { results?: Resultado[] };
        // Un plan de vuelo de EANA sale de un aeródromo argentino: primero esos. "moron"
        // traía antes aeródromos de Madagascar que Morón.
        const ordenados = [...(data.results ?? [])].sort((a, b) => Number(b.country === "AR") - Number(a.country === "AR"));
        if (n === pedido.current) setResultados(ordenados.slice(0, 6));
      } catch {
        if (n === pedido.current) setResultados([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [texto]);

  /** Si lo escrito es exactamente un código de la lista, se elige solo: no se pierde al salir. */
  const elegirExacto = () => {
    const q = texto.trim().toUpperCase();
    const exacto = resultados.find((r) => r.icao.toUpperCase() === q);
    if (exacto) elegir(exacto);
  };

  const elegir = (r: Resultado) => {
    onCambio({ codigo: r.icao, nombre: r.label || r.name, lat: r.lat, lon: r.lon });
    setTexto("");
    setResultados([]);
    setAbierto(false);
  };

  if (valor) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Cambiar el aeródromo"
          // Tocarlo es para cambiarlo: vuelve el buscador con el código escrito.
          onClick={() => {
            setTexto(valor.codigo);
            setAbierto(true);
            onCambio(null);
          }}
          className={`${claseInput} flex items-baseline gap-2 text-left`}
        >
          <span className="data font-bold">{valor.codigo}</span>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">{valor.nombre}</span>
        </button>
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
        autoFocus={!!texto}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          elegirExacto();
          setTimeout(() => setAbierto(false), 200);
        }}
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
        <ul className={`absolute z-20 ${alinear === "derecha" ? "right-0" : "left-0"} min-w-full w-72 max-w-[calc(100vw-3rem)] mt-1 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden`}>
          {resultados.map((r) => (
            <li key={r.icao}>
              <button
                type="button"
                // Se elige al apoyar, no al soltar: con el dedo, el campo pierde el foco antes del
                // clic y la lista se cerraba antes de que llegara.
                onPointerDown={(e) => {
                  e.preventDefault();
                  elegir(r);
                }}
                // Con teclado (Enter o espacio sobre la opción) no hay pointerdown.
                onClick={(e) => {
                  if (e.detail === 0) elegir(r);
                }}
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
