"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { createPlannedFlight } from "@/actions/planned-flight";
import { mesDe, prefillHref, type DiaCalendario } from "@/lib/planned-flights";
import type { Aircraft, Flight, PlannedFlight } from "@/types";

/**
 * La grilla del mes.
 *
 * Recibe `mesIso` y `todayIso` ya resueltos desde el server: **este componente no
 * llama a `new Date()` para decidir nada de eso**, y por lo tanto servidor y
 * navegador no pueden discrepar de día. Lo único que hace con fechas es pasárselas
 * a `mesDe`, que es puro y está testeado.
 *
 * Dos presentaciones sobre **una sola estructura de datos**: grilla en escritorio y
 * agenda en el teléfono. Abajo de `sm`, siete columnas dan celdas de ~44 px y no
 * entra "SADF SADR"; una segunda grilla calculada aparte sería un segundo cálculo
 * que mantener sincronizado.
 */

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const CARD =
  "rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none";

interface Props {
  planned: PlannedFlight[];
  flights: Flight[];
  aircraft: Aircraft[];
  mesIso: string;
  todayIso: string;
}

export default function CalendarioClient({ planned, flights, aircraft, mesIso, todayIso }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mes = useMemo(
    () => mesDe({ mesIso, todayIso, planned, flights }),
    [mesIso, todayIso, planned, flights]
  );

  const matriculas = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of aircraft) m.set(a.id, a.registration);
    return m;
  }, [aircraft]);

  const conAlgo = useMemo(
    () => mes.semanas.flat().filter((d) => d.delMes && (d.planned.length || d.flights.length)),
    [mes]
  );

  async function programar(formData: FormData) {
    setError(null);
    setEnviando(true);
    const res = await createPlannedFlight({
      date: String(formData.get("date") || ""),
      aircraft_id: (formData.get("aircraft_id") as string) || null,
      route: ((formData.get("route") as string) || "").trim().toUpperCase() || null,
      notes: ((formData.get("notes") as string) || "").trim() || null,
    });
    setEnviando(false);
    if (res && "error" in res && res.error) setError(res.error);
    else setAbierto(false);
  }

  return (
    <div className="space-y-6">
      {/* Barra de mes ------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/calendario?mes=${mes.anterior}`}
            aria-label="Mes anterior"
            className="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="font-display font-bold text-xl md:text-2xl text-zinc-900 dark:text-white min-w-[10rem] text-center">
            {mes.etiqueta}
          </span>
          <Link
            href={`/dashboard/calendario?mes=${mes.siguiente}`}
            aria-label="Mes siguiente"
            className="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold shadow-cal-highlight"
        >
          {abierto ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {abierto ? "Cancelar" : "Programar"}
        </button>
      </div>

      {/* Alta -------------------------------------------------------------- */}
      {abierto && (
        <form action={programar} className={`${CARD} p-6 md:p-8 space-y-5`}>
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="space-y-1.5">
              <span className="eyebrow">Fecha</span>
              <input
                type="date"
                name="date"
                required
                defaultValue={todayIso}
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
            </label>
            <label className="space-y-1.5">
              <span className="eyebrow">Aeronave</span>
              <select
                name="aircraft_id"
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm text-zinc-900 dark:text-white"
              >
                <option value="">Sin definir</option>
                {aircraft.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.registration}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="eyebrow">Ruta</span>
              <input
                type="text"
                name="route"
                placeholder="SADF SADR"
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm data text-zinc-900 dark:text-white"
              />
            </label>
            <label className="space-y-1.5">
              <span className="eyebrow">Nota</span>
              <input
                type="text"
                name="notes"
                placeholder="Opcional"
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
            </label>
          </div>
          {/* Sin hora ni duración a propósito: eso se completa al registrar el
              vuelo, donde el formulario ya sabe pedirlas en UTC. */}
          <button
            type="submit"
            disabled={enviando}
            className="px-8 py-3 rounded-full bg-aviation-blue text-white text-sm font-bold disabled:opacity-50"
          >
            {enviando ? "Programando…" : "Programar"}
          </button>
        </form>
      )}

      {/* Grilla ------------------------------------------------------------ */}
      <div className={`${CARD} p-4 md:p-6 hidden sm:block`}>
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {DIAS.map((d) => (
            <div key={d} className="eyebrow text-center py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {mes.semanas.flat().map((dia) => (
            <Celda key={dia.iso} dia={dia} matriculas={matriculas} todayIso={todayIso} />
          ))}
        </div>
      </div>

      {/* Agenda (teléfono) ------------------------------------------------- */}
      <div className="sm:hidden space-y-3">
        {conAlgo.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-zinc-200 dark:border-white/10 p-10 text-center">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Nada este mes</h3>
            <p className="mt-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Ni vuelos registrados ni programados.
            </p>
          </div>
        ) : (
          conAlgo.map((dia) => (
            <div key={dia.iso} className={`${CARD} p-4`}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="data text-lg font-bold text-zinc-900 dark:text-white">{dia.dia}</span>
                <span className="eyebrow">{DIAS[(new Date(`${dia.iso}T00:00:00Z`).getUTCDay() + 6) % 7]}</span>
              </div>
              <Contenido dia={dia} matriculas={matriculas} todayIso={todayIso} />
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 px-2">
        Los vuelos registrados van en sólido; los programados, con borde punteado. Un
        vuelo programado nunca suma horas.
      </p>
    </div>
  );
}

function Celda({
  dia,
  matriculas,
  todayIso,
}: {
  dia: DiaCalendario;
  matriculas: Map<string, string>;
  todayIso: string;
}) {
  return (
    <div
      className={`min-h-[5.5rem] rounded-xl p-1.5 border ${
        dia.delMes
          ? "border-zinc-100 dark:border-white/5"
          : "border-transparent bg-zinc-50/50 dark:bg-white/[0.01]"
      }`}
    >
      <div
        className={`data text-[11px] mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
          dia.esHoy
            ? "ring-2 ring-aviation-blue dark:ring-aviation-cyan text-zinc-900 dark:text-white font-bold"
            : dia.delMes
              ? "text-zinc-500 dark:text-zinc-400"
              : "text-zinc-300 dark:text-zinc-700"
        }`}
      >
        {dia.dia}
      </div>
      <Contenido dia={dia} matriculas={matriculas} todayIso={todayIso} />
    </div>
  );
}

/**
 * Lo que pasó y lo que se planea, en el mismo día.
 *
 * El vuelo registrado es un hecho: relleno sólido. El programado es una intención:
 * borde punteado, que es el vocabulario que la app ya usa para lo pendiente. El
 * programado que ya pasó y sigue sin contestar lleva ámbar — nunca rojo, porque un
 * plan sin confirmar no es una infracción.
 */
function Contenido({
  dia,
  matriculas,
  todayIso,
}: {
  dia: DiaCalendario;
  matriculas: Map<string, string>;
  todayIso: string;
}) {
  return (
    <div className="space-y-1">
      {dia.flights.map((f) => (
        <div
          key={f.id}
          title={f.route}
          className="data text-[10px] leading-tight truncate px-1.5 py-1 rounded-md bg-zinc-900 dark:bg-white/90 text-white dark:text-zinc-900"
        >
          {f.route}
        </div>
      ))}
      {dia.planned.map((p) => {
        const vencido = p.status === "programado" && p.date < todayIso;
        const cerrado = p.status !== "programado";
        return (
          <Link
            key={p.id}
            href={p.status === "programado" ? prefillHref(p) : "/dashboard/calendario"}
            title={p.notes || p.route || "Vuelo programado"}
            className={`block data text-[10px] leading-tight truncate px-1.5 py-1 rounded-md border border-dashed ${
              cerrado
                ? "border-zinc-200 dark:border-white/10 text-zinc-300 dark:text-zinc-600 line-through"
                : vencido
                  ? "border-amber-500/40 text-amber-600 dark:text-amber-500"
                  : "border-zinc-300 dark:border-white/20 text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {p.route || (p.aircraft_id && matriculas.get(p.aircraft_id)) || "Programado"}
          </Link>
        );
      })}
    </div>
  );
}
