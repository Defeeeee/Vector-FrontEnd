"use client";

import { OpeningBalanceInput } from "@/actions/logbook";

/**
 * La grilla de saldo inicial de un libro, compartida.
 *
 * Vivía dentro de `LogbookForm` (`LogbooksManager`), que es la única pantalla que
 * la tenía. El wizard de onboarding la necesita también, y **copiarla sería la
 * forma más rápida de que un día un bucket ANAC cambie en un lado y no en el
 * otro**. Son 11 categorías más aterrizajes, y su orden es el mismo del panel
 * ANAC del formulario de vuelo: no es arbitrario y no conviene reordenarlo acá.
 */

/** Same categories, in the same order, as the ANAC panel in the flight form. */
export const OPENING_FIELDS: { key: keyof OpeningBalanceInput; label: string }[] = [
  { key: "pic_day_loc", label: "PIC Día Local" },
  { key: "pic_day_tra", label: "PIC Día Travesía" },
  { key: "pic_night_loc", label: "PIC Noche Local" },
  { key: "pic_night_tra", label: "PIC Noche Travesía" },
  { key: "sic_day_loc", label: "SIC Día Local" },
  { key: "sic_day_tra", label: "SIC Día Travesía" },
  { key: "sic_night_loc", label: "SIC Noche Local" },
  { key: "sic_night_tra", label: "SIC Noche Travesía" },
  { key: "imc_pil", label: "IMC Piloto" },
  { key: "imc_cop", label: "IMC Copiloto" },
  { key: "capota", label: "Capota" },
];

/** Only the PIC/SIC buckets — IMC and hood overlap flight time, they don't add to it. */
export const TOTAL_KEYS: (keyof OpeningBalanceInput)[] = OPENING_FIELDS.slice(0, 8).map((f) => f.key);

export function openingTotal(opening: OpeningBalanceInput): number {
  return TOTAL_KEYS.reduce((acc, k) => acc + (Number(opening[k]) || 0), 0);
}

const INPUT_CLASS =
  "w-full data bg-transparent border-b border-zinc-200 dark:border-white/10 py-1.5 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-aviation-blue transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function OpeningBalanceFields({
  opening,
  setField,
  descripcion,
}: {
  opening: OpeningBalanceInput;
  setField: (key: keyof OpeningBalanceInput, raw: string) => void;
  descripcion?: string;
}) {
  const total = openingTotal(opening);

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {descripcion ??
          "Horas que traés de antes, para no cargar vuelo por vuelo. Va por categoría y no como un total suelto: es lo que permite que el desglose ANAC y el seguimiento de licencia sigan siendo correctos."}
      </p>

      <div className="flex items-center justify-between rounded-2xl bg-zinc-900 dark:bg-white/5 px-4 py-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">
          Total del saldo
        </span>
        <span className="data text-base font-bold text-white">{total.toFixed(1)} hs</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {OPENING_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="block font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {f.label}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              placeholder="0.0"
              value={opening[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="block font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Aterrizajes
          </label>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={opening.landings ?? ""}
            onChange={(e) => setField("landings", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
