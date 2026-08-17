import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import { pesos, type GastoDelPeriodo } from "@/lib/costos";

/**
 * Lo que va del mes, en plata.
 *
 * Vector tenía los dos factores desde siempre —`aircraft.cost_per_hour` y las
 * transacciones que registra cada vuelo— y nunca los mostraba juntos. Para un
 * alumno de escuela que paga la hora, "cuánto llevo gastado este mes" es la
 * pregunta que se hace todos los meses, y la contestaba a mano.
 *
 * **No aparece si no hay nada que decir.** Sin cobros —modo `packs`, o aeronaves
 * sin precio cargado— la tarjeta se va entera en vez de mostrar un cero, que se
 * leería como "no gastaste" cuando lo cierto es "no lo sabemos".
 */
export default function GastoDelMes({ gasto }: { gasto: GastoDelPeriodo }) {
  if (gasto.pesos <= 0) return null;

  // Del gasto y las horas, no de `cost_per_hour`: es lo que efectivamente se pagó
  // este mes, promediando aeronaves distintas si volaste varias.
  const porHora = gasto.horas > 0 ? gasto.pesos / gasto.horas : null;

  return (
    <Link
      href="/dashboard/balance"
      className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-6 md:p-8 hover:shadow-lg dark:hover:bg-white/[0.04] transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
        <Wallet className="w-4 h-4 text-white dark:text-zinc-900" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="eyebrow">Lo que va del mes</p>
        <p className="data text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white leading-none mt-1">
          {pesos(gasto.pesos)}
        </p>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5">
          <span className="data">{gasto.vuelos}</span>{" "}
          {gasto.vuelos === 1 ? "vuelo" : "vuelos"} ·{" "}
          <span className="data">{gasto.horas.toFixed(1)}</span> hs
          {porHora !== null && (
            <>
              {" · "}
              <span className="data">{pesos(porHora)}</span> la hora
            </>
          )}
        </p>
      </div>

      <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0">
        Ver saldo
        <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
