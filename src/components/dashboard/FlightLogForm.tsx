"use client";

import { useEffect, useMemo, useState } from "react";
import { Aircraft, AirportRef } from "@/types";
import { logFlight } from "@/actions/flight";
import { ArrowRight, Loader2, Compass, User, Cloud, AlertCircle, Percent, Minus, Plus } from "lucide-react";
import {
  calculateBlockMinutes,
  calculateFlightDuration,
  formatBlockTime,
} from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import AirportResolver from "./AirportResolver";
import StyledSelect from "./StyledSelect";
import TimeAllocator, { TimeCategory } from "./TimeAllocator";
import { useAnacBreakdown } from "@/hooks/useAnacBreakdown";

const PURPOSE_OPTIONS = [
  { value: "ACR", label: "ACR – Acrobacia" },
  { value: "ADAP", label: "ADAP – Adaptación" },
  { value: "AER", label: "AER – Aeroaplicación" },
  { value: "CI", label: "CI – Combate contra Incendios" },
  { value: "ENT", label: "ENT – Entrenamiento" },
  { value: "EXA", label: "EXA – Examen" },
  { value: "FOR", label: "FOR – Formación" },
  { value: "FOT", label: "FOT – Fotografía" },
  { value: "I", label: "I – Instructor (Impartición Instrucción)" },
  { value: "INST", label: "INST – Instrucción (Recepción Instrucción)" },
  { value: "IP", label: "IP – Inspector (Inspección de Pilotos o Alumnos)" },
  { value: "LA", label: "LA – Línea Aérea (RAAC 121)" },
  { value: "LP", label: "LP – Lanzamiento Paracaidistas" },
  { value: "N", label: "N – Transporte Aéreo no Regular (RAAC 135)" },
  { value: "PA", label: "PA – Prueba de Aeronaves" },
  { value: "READ", label: "READ – Readaptación" },
  { value: "RP", label: "RP – Remolque Planeadores" },
  { value: "SAN", label: "SAN – Sanitario" },
  { value: "TA", label: "TA – Trabajo Aéreo" },
  { value: "TAXI", label: "TAXI – Taxi Aéreo" },
  { value: "VO", label: "VO – Vuelo Oficial" },
  { value: "VP", label: "VP – Vuelo Privado" },
];

const DISCOUNT_OPTIONS = [
  { value: "", label: "Sin descuento" },
  { value: "value", label: "Valor fijo ($)" },
  { value: "percent", label: "Porcentaje (%)" },
];

/** Field names below are exactly what the backend already accepts. */
const PIC_SIC_CATEGORIES: TimeCategory[] = [
  { key: "pic_day_loc", label: "PIC Día Local" },
  { key: "pic_day_tra", label: "PIC Día Travesía" },
  { key: "pic_night_loc", label: "PIC Noche Local" },
  { key: "pic_night_tra", label: "PIC Noche Travesía" },
  { key: "sic_day_loc", label: "SIC Día Local" },
  { key: "sic_day_tra", label: "SIC Día Travesía" },
  { key: "sic_night_loc", label: "SIC Noche Local" },
  { key: "sic_night_tra", label: "SIC Noche Travesía" },
];

const CONDITION_CATEGORIES: TimeCategory[] = [
  { key: "imc_pil", label: "IMC Piloto" },
  { key: "imc_cop", label: "IMC Copiloto" },
  { key: "capota", label: "Capota" },
  { key: "sim_instructor", label: "Sim. Instrumentos" },
  { key: "sim_pil_en_inst", label: "Sim. Piloto" },
];

const PIC_SIC_KEYS = PIC_SIC_CATEGORIES.map((c) => c.key);
const CONDITION_KEYS = CONDITION_CATEGORIES.map((c) => c.key);

interface FlightLogFormProps {
  aircraft: Aircraft[];
  initialData?: {
    aircraft_id?: string;
    route?: string;
    takeoff?: string;
    landing?: string;
    date?: string;
    landings?: number;
    duration?: string;
    discount_type?: string;
    discount_amount?: number;
    purpose?: string;
  };
  onSuccess?: () => void;
  inModal?: boolean;
  /**
   * Renders a "Cancelar" next to the submit. Only passed by the new-flight
   * dialog — the live-session modal has its own way out and doesn't want a
   * second dismiss control competing with it.
   */
  onCancel?: () => void;
  /**
   * Pins the actions to the bottom of the scroller instead of letting them sit
   * at the end of the form.
   *
   * Opt-in rather than implied by `inModal`, because it bleeds past the
   * horizontal padding to cover the full dialog width — a measurement that only
   * matches the new-flight dialog. The live-session modal uses different
   * padding and keeps the actions inline.
   */
  stickyActions?: boolean;
}

/** "SAEZ SACO" / "SAEZ-SACO" -> ["SAEZ", "SACO"]. */
function splitRoute(route?: string): [string, string] {
  const parts = (route ?? "").split(/[\s-]+/).map((p) => p.trim().toUpperCase()).filter(Boolean);
  return [parts[0] ?? "", parts[1] ?? parts[0] ?? ""];
}

export default function FlightLogForm({ aircraft, initialData, onSuccess, inModal = false, onCancel, stickyActions = false }: FlightLogFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [initialOrigin, initialDestination] = splitRoute(initialData?.route);
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [originAirport, setOriginAirport] = useState<AirportRef | null>(null);
  const [destinationAirport, setDestinationAirport] = useState<AirportRef | null>(null);

  const [takeoff, setTakeoff] = useState(initialData?.takeoff || "");
  const [landing, setLanding] = useState(initialData?.landing || "");
  const [manualDuration, setManualDuration] = useState(initialData?.duration || "");
  const [landings, setLandings] = useState(initialData?.landings?.toString() || "1");
  const [aircraftId, setAircraftId] = useState(initialData?.aircraft_id || "");
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split("T")[0]);

  const [discountType, setDiscountType] = useState(initialData?.discount_type || "");
  const [discountAmount, setDiscountAmount] = useState(
    initialData?.discount_amount ? String(initialData.discount_amount) : ""
  );
  const [purpose, setPurpose] = useState(initialData?.purpose || "VP");

  /** null = follow origin/destination; set once the pilot overrides the toggle. */
  const [crossCountryOverride, setCrossCountryOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (initialData?.purpose) setPurpose(initialData.purpose);
  }, [initialData?.purpose]);

  // Raw block time vs. the ANAC-rounded decimal that actually goes on the books.
  const blockMinutes = calculateBlockMinutes(takeoff, landing);
  const computedDuration = takeoff && landing ? calculateFlightDuration(takeoff, landing) : 0;
  // A hand-typed duration wins, so correcting the number stays possible.
  const total = manualDuration !== "" ? parseFloat(manualDuration) || 0 : computedDuration;

  useEffect(() => {
    if (takeoff && landing) setManualDuration("");
  }, [takeoff, landing]);

  const isCrossCountry =
    crossCountryOverride ?? (Boolean(origin) && Boolean(destination) && origin !== destination);

  const remainderKey = isCrossCountry ? "pic_day_tra" : "pic_day_loc";

  const picSicKeys = useMemo(() => PIC_SIC_KEYS, []);
  const conditionKeys = useMemo(() => CONDITION_KEYS, []);

  const breakdown = useAnacBreakdown({ total, keys: picSicKeys, pooled: true, remainderKey });
  const conditions = useAnacBreakdown({ total, keys: conditionKeys, pooled: false });

  const lastLabel = breakdown.lastTouched
    ? PIC_SIC_CATEGORIES.find((c) => c.key === breakdown.lastTouched)?.label
    : null;

  async function handleSubmit(formData: FormData) {
    setError(null);

    if (!origin || origin.length !== 4) {
      setError("Ingresá un aeródromo de salida válido (4 letras).");
      return;
    }
    if (!destination || destination.length !== 4) {
      setError("Ingresá un aeródromo de llegada válido (4 letras).");
      return;
    }
    if (total <= 0) {
      setError("El vuelo necesita un tiempo total mayor a cero.");
      return;
    }

    setIsPending(true);
    // The allocator can't produce an over-assigned breakdown, so there is no
    // sum check here any more — the backend still validates as a backstop.
    formData.set("route", `${origin} ${destination}`);
    formData.set("duration", total.toFixed(1));

    try {
      await logFlight(formData);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setError(e.message || "Error al registrar el vuelo");
      setIsPending(false);
    }
  }

  const ledgerInput =
    "w-full bg-transparent border-b-2 border-zinc-200 dark:border-white/10 focus:border-zinc-900 dark:focus:border-white py-2 text-sm font-semibold text-zinc-900 dark:text-white outline-none transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700";

  return (
    <form action={handleSubmit} className="w-full">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-[2rem] p-6 flex items-center space-x-4 text-red-600 dark:text-red-500 shadow-sm overflow-hidden"
          >
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* `overflow-hidden` clips the card's rounded corners on the page, but
          inside a dialog it would also make this box the sticky footer's scroll
          context — pinning the actions to a 1400 px-tall element instead of to
          the visible scroller, i.e. not pinning them at all. The modal draws
          its own rounding, so here the clip is pure downside. */}
      <div
        className={`${
          inModal
            ? ""
            : "bg-white dark:bg-[#111111] border border-zinc-200 dark:border-white/10 rounded-3xl md:rounded-[2.5rem] shadow-cal dark:shadow-none overflow-hidden"
        } flex flex-col transition-colors`}
      >
        {!inModal && (
          <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg md:text-xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tight">
                Nueva entrada
              </h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Bitácora electrónica</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-[#111111] rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm border border-zinc-200 dark:border-white/10 transition-colors">
              <Compass className="w-5 h-5 md:w-6 md:h-6 text-zinc-900 dark:text-white" />
            </div>
          </div>
        )}

        <div className={`${inModal ? "p-0" : "p-6 md:p-8"} space-y-8 md:space-y-10`}>
          {/* 01. General */}
          <div className="space-y-6">
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">01. Información general</p>

            {/* Route — two resolving chips joined by an arrow. */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                  <AirportResolver
                    label="Salida"
                    value={origin}
                    onChange={setOrigin}
                    onResolve={setOriginAirport}
                    placeholder="SADM"
                  />
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 shrink-0 mt-9" />
                <div className="flex-1 min-w-0">
                  <AirportResolver
                    label="Llegada"
                    value={destination}
                    onChange={setDestination}
                    onResolve={setDestinationAirport}
                    placeholder="SAEZ"
                  />
                </div>
              </div>
              <input type="hidden" name="route" value={`${origin} ${destination}`.trim()} />

              {/* Auto-set from the two codes, but still the pilot's call. */}
              <div className="flex items-center gap-2">
                <SegmentToggle
                  active={!isCrossCountry}
                  onClick={() => setCrossCountryOverride(false)}
                  label="Local"
                />
                <SegmentToggle
                  active={isCrossCountry}
                  onClick={() => setCrossCountryOverride(true)}
                  label="Travesía"
                />
                {crossCountryOverride !== null && (
                  <button
                    type="button"
                    onClick={() => setCrossCountryOverride(null)}
                    className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-wide"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-10 gap-y-6">
              <LedgerField label="Aeronave" className="col-span-2 md:col-span-2">
                <StyledSelect
                  name="aircraft_id"
                  required
                  value={aircraftId}
                  onChange={setAircraftId}
                  placeholder="Seleccionar aeronave..."
                  options={aircraft.map((ac) => ({
                    value: ac.id,
                    label: ac.registration,
                    hint: ac.type,
                  }))}
                />
              </LedgerField>

              <LedgerField label="Finalidad" className="col-span-2 md:col-span-2">
                <StyledSelect
                  name="purpose"
                  required
                  searchable
                  value={purpose}
                  onChange={setPurpose}
                  placeholder="Seleccionar finalidad..."
                  options={PURPOSE_OPTIONS}
                />
              </LedgerField>

              <LedgerField label="Fecha">
                <input
                  type="date"
                  name="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${ledgerInput} [color-scheme:light] dark:[color-scheme:dark]`}
                />
              </LedgerField>

              <LedgerField label="Aterrizajes">
                <LandingsStepper value={landings} onChange={setLandings} />
              </LedgerField>

              <LedgerField label="Despegue (UTC)">
                <input
                  type="time"
                  name="takeoff"
                  required
                  value={takeoff}
                  onChange={(e) => setTakeoff(e.target.value)}
                  className={`${ledgerInput} [color-scheme:light] dark:[color-scheme:dark]`}
                />
              </LedgerField>

              <LedgerField label="Aterrizaje (UTC)">
                <input
                  type="time"
                  name="landing"
                  required
                  value={landing}
                  onChange={(e) => setLanding(e.target.value)}
                  className={`${ledgerInput} [color-scheme:light] dark:[color-scheme:dark]`}
                />
              </LedgerField>
            </div>

            {/* Block time vs. ANAC time — the distinction the old single
                "Tiempo (h)" field hid. */}
            <TimeSummary
              blockMinutes={blockMinutes}
              total={total}
              manualDuration={manualDuration}
              onManualDuration={setManualDuration}
            />
          </div>

          {/* 02. Breakdown */}
          <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">02. Desglose de tiempos</p>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {lastLabel && breakdown.values[breakdown.lastTouched!] > 0 && (
                    <motion.span
                      key={breakdown.lastTouched}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-[10px] font-bold uppercase tracking-wide text-aviation-blue-dark dark:text-aviation-cyan bg-aviation-blue/10 dark:bg-aviation-cyan/10 px-2.5 py-1 rounded-full whitespace-nowrap"
                    >
                      {breakdown.values[breakdown.lastTouched!].toFixed(1)} {lastLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
                <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 dark:bg-white/5 px-4 py-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Asignado
              </span>
              <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                {breakdown.assigned.toFixed(1)} / {total.toFixed(1)} h
              </span>
              {breakdown.unassigned > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                  {breakdown.unassigned.toFixed(1)} sin asignar
                </span>
              )}
            </div>

            <TimeAllocator
              categories={PIC_SIC_CATEGORIES}
              breakdown={breakdown}
              remainderKey={remainderKey}
            />
          </div>

          {/* 03. Conditions — capped at the total, but they overlap each other
              rather than partitioning it, so no shared pool here. */}
          <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                03. Condiciones y simulador
              </p>
              <Cloud className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </div>
            <TimeAllocator categories={CONDITION_CATEGORIES} breakdown={conditions} />
          </div>

          {/* 04. Discounts — untouched, this is Vector's own concept. */}
          <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">04. Descuento aplicado</p>
              <Percent className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-10 gap-y-6">
              <LedgerField label="Tipo de descuento">
                <StyledSelect
                  name="discount_type"
                  value={discountType}
                  onChange={setDiscountType}
                  placeholder="Sin descuento"
                  options={DISCOUNT_OPTIONS}
                />
              </LedgerField>
              {discountType && (
                <LedgerField
                  label={discountType === "value" ? "Monto de descuento ($)" : "Porcentaje de descuento (%)"}
                >
                  <input
                    type="number"
                    name="discount_amount"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className={ledgerInput}
                  />
                </LedgerField>
              )}
            </div>
          </div>
        </div>

        {/* Inside a dialog the actions stick to the bottom of the scroller so
            they're reachable without scrolling to the end of the form — the
            form is long, and burying "Registrar" under it is what made the
            page version feel like paperwork rather than a quick action. */}
        <div
          className={`${
            stickyActions
              ? "sticky bottom-0 z-20 -mx-6 md:-mx-10 px-6 md:px-10 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-8 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 flex items-center gap-3"
              : inModal
                ? "p-0 pt-6 flex items-center gap-3"
                : "p-6 md:p-8 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5"
          }`}
        >
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="shrink-0 px-6 py-5 md:py-6 rounded-xl md:rounded-[1.5rem] text-sm font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isPending}
            type="submit"
            className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm py-5 md:py-6 rounded-xl md:rounded-[1.5rem] shadow-cal-highlight dark:shadow-none flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Registrar vuelo</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  );
}

/** Block time chip + the ANAC decimal that the rest of the form is bounded by. */
function TimeSummary({
  blockMinutes,
  total,
  manualDuration,
  onManualDuration,
}: {
  blockMinutes: number;
  total: number;
  manualDuration: string;
  onManualDuration: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const hasTimes = blockMinutes > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-4 rounded-2xl bg-zinc-900 dark:bg-white/5 px-5 py-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Block time
        </p>
        <p className="text-2xl font-bold tabular-nums text-white leading-tight">
          {hasTimes ? formatBlockTime(blockMinutes) : "—:—"}
        </p>
      </div>

      <div className="w-px h-9 bg-white/15" />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Tiempo ANAC
        </p>
        {editing ? (
          <input
            type="number"
            step="0.1"
            min="0"
            autoFocus
            value={manualDuration || total.toFixed(1)}
            onChange={(e) => onManualDuration(e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-20 bg-transparent border-b border-aviation-cyan text-2xl font-bold tabular-nums text-aviation-cyan outline-none leading-tight"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Editar el tiempo redondeado"
            className="text-2xl font-bold tabular-nums text-aviation-cyan leading-tight hover:opacity-80 transition-opacity"
          >
            {total > 0 ? total.toFixed(1) : "0.0"}
          </button>
        )}
      </div>

      <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 ml-auto max-w-[14rem] leading-snug">
        {hasTimes
          ? "Redondeado por la regla de 0.3 (15 min = 0.3 h). Tocá el número para corregirlo."
          : "Completá despegue y aterrizaje para calcularlo."}
      </p>

      <input type="hidden" name="duration" value={total > 0 ? total.toFixed(1) : ""} />
    </div>
  );
}

function SegmentToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
        active ? "text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
      }`}
    >
      {active && (
        <motion.span
          layoutId="route-kind"
          className="absolute inset-0 rounded-full bg-aviation-blue"
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function LedgerField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide block">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * −/+ stepper for the landings count.
 *
 * Replaces a bare number input. Landings are almost always adjusted by one at a
 * time — a circuit session is "three, no wait, four" — and on a phone a tap
 * beats selecting the field and retyping. The value still posts through a
 * hidden input under the same `landings` name, so the server action is
 * untouched.
 *
 * Typing stays available: the middle is a real input, not a label, for the
 * pilot who did eleven touch-and-goes and doesn't want to press + eleven times.
 */
function LandingsStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = parseInt(value, 10);
  const safe = Number.isFinite(current) ? current : 1;

  const step = (delta: number) => onChange(String(Math.max(0, safe + delta)));

  const buttonClass =
    "w-9 h-9 shrink-0 rounded-xl border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center gap-2 py-1">
      <button type="button" onClick={() => step(-1)} disabled={safe <= 0} aria-label="Un aterrizaje menos" className={buttonClass}>
        <Minus className="w-4 h-4" strokeWidth={2.5} />
      </button>

      <input
        type="number"
        name="landings"
        min="0"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Aterrizajes"
        className="w-full min-w-0 bg-transparent text-center text-lg font-bold tabular-nums text-zinc-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button type="button" onClick={() => step(1)} aria-label="Un aterrizaje más" className={buttonClass}>
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
