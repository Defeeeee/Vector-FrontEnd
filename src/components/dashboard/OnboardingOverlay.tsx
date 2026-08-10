"use client";

import { Profile } from "@/types";
import { updateProfile } from "@/actions/profile";
import { upsertCmaDocument } from "@/actions/document";
import { addAircraft } from "@/actions/flight";
import { createLogbook, OpeningBalanceInput } from "@/actions/logbook";
import { Calendar, CreditCard, ArrowRight, Loader2, Compass, Plane, BookOpen } from "lucide-react";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OpeningBalanceFields, { openingTotal } from "./OpeningBalanceFields";

/**
 * El arranque, en tres pasos.
 *
 * **Por qué tres y no dos campos.** El embudo medido decía: de 15 registrados, 8
 * completaban este overlay, 4 cargaban una aeronave y **1 llegaba a cargar un
 * vuelo**. El overlay pedía licencia y CMA, o sea que terminaba *justo antes* de
 * los dos escalones donde se perdía la gente. Ahora los pide acá, en el momento
 * de más intención, en vez de esperar que el piloto los descubra solo.
 *
 * **Todo es salteable menos la licencia.** Un modal que no se puede cerrar y pide
 * datos que el piloto no tiene a mano no lo retiene: lo expulsa. El CMA salteado
 * queda reflejado en el semáforo (`pilotStatus` devuelve `documento_faltante`), y
 * lo que se saltee acá lo recoge el checklist del dashboard.
 *
 * **Cada paso guarda lo suyo y no avanza si falló.** Antes los dos writes iban
 * juntos y si el segundo fallaba quedaba a medias sin decirlo.
 */

interface OnboardingOverlayProps {
  profile: Profile | null;
}

const INPUT =
  "w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-900 dark:focus:border-white/50 transition-all text-zinc-900 dark:text-white font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-600";

export default function OnboardingOverlay({ profile }: OnboardingOverlayProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(true);
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<OpeningBalanceInput>({});
  const [mostrarSaldo, setMostrarSaldo] = useState(false);

  // El gate sigue siendo la licencia: es el único dato que el paso 1 exige, así
  // que es el único que garantiza que el piloto pasó por acá. Lo que falte
  // después lo nombra el checklist del dashboard, que no bloquea.
  const needsOnboarding = profile?.license_type === "-";

  if (!needsOnboarding || !isOpen) return null;

  const setField = (key: keyof OpeningBalanceInput, raw: string) =>
    setOpening((prev) => ({ ...prev, [key]: raw === "" ? undefined : Number(raw) }));

  function paso1(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateProfile(formData);

        // El CMA es opcional a propósito. Si no vino, no se escribe nada y el
        // semáforo lo va a mostrar como dato faltante en vez de suponer una fecha.
        const cma = (formData.get("cma_document_expiry") as string) || "";
        if (cma) {
          const r = await upsertCmaDocument(cma);
          if (r?.error) {
            setError(r.error);
            return;
          }
        }
        setPaso(2);
      } catch {
        setError("No se pudieron guardar los datos de tu licencia.");
      }
    });
  }

  function paso2(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addAircraft(formData);
        setPaso(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo registrar la aeronave.");
      }
    });
  }

  function paso3() {
    setError(null);
    startTransition(async () => {
      // El primer libro que crea un usuario queda como default en el backend, así
      // que esto no compite con el "Mi libro" que se auto-crea al cargar un vuelo.
      const r = await createLogbook({ name: "Mi libro", opening });
      if (r?.error) {
        setError(r.error);
        return;
      }
      setIsOpen(false);
    });
  }

  const titulos = {
    1: { icono: Compass, titulo: "Bienvenido a Vector", bajada: "Empecemos por tu licencia. El certificado médico podés cargarlo ahora o después." },
    2: { icono: Plane, titulo: "Tu primera aeronave", bajada: "Un vuelo se anota contra una aeronave. Cargá la que usás y ya podés registrar vuelos." },
    3: { icono: BookOpen, titulo: "¿Traés horas de antes?", bajada: "Si ya volabas, cargá el saldo y no tenés que registrar vuelo por vuelo hasta hoy." },
  } as const;

  const { icono: Icono, titulo, bajada } = titulos[paso];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-8 overflow-y-auto"
      >
        <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/70 backdrop-blur-md" />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-xl my-auto bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-cal dark:shadow-none space-y-8"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Icono className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-zinc-900 dark:text-white">{titulo}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm leading-relaxed max-w-sm">{bajada}</p>

            <div className="flex items-center gap-2 pt-1" aria-label={`Paso ${paso} de 3`}>
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    n === paso ? "w-6 bg-zinc-900 dark:bg-white" : "w-1.5 bg-zinc-200 dark:bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-red-600 dark:text-red-500 text-sm font-medium">
              {error}
            </div>
          )}

          {paso === 1 && (
            <form action={paso1} className="space-y-6">
              <input type="hidden" name="id" value={profile?.id || ""} />
              <input type="hidden" name="first_name" value={profile?.first_name || ""} />
              <input type="hidden" name="last_name" value={profile?.last_name || ""} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Licencia inicial</label>
                  <div className="relative group">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input name="license_type" required defaultValue="PPA" placeholder="PPA, PCA, TLA..." className={`${INPUT} uppercase`} />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">
                    Vencimiento CMA <span className="text-zinc-400 dark:text-zinc-600">(opcional)</span>
                  </label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    {/*
                      Sin `defaultValue`. Antes venía pre-cargado con 2027-12-31 y
                      quien pasara sin mirar quedaba con una fecha inventada
                      alimentando el semáforo de 61.060(a)(1) y las alertas de
                      vencimiento. Un dato regulatorio falso es peor que ninguno.
                    */}
                    <input
                      name="cma_document_expiry"
                      type="date"
                      className={`${INPUT} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Si lo dejás vacío, Vector no va a poder confirmar si estás en condiciones de volar
                —lo va a decir así, no va a suponer que sí— y te lo va a recordar en el tablero.
              </p>

              <Continuar isPending={isPending} texto="Continuar" />
            </form>
          )}

          {paso === 2 && (
            <form action={paso2} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Campo label="Matrícula" name="registration" placeholder="ej. LV-ABC" uppercase />
                <Campo label="Marca y modelo" name="type" placeholder="ej. Cessna 150" />
                <Campo label="Tipo ICAO" name="icao" placeholder="ej. C150" uppercase />
                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Categoría (ANAC)</label>
                  <select name="type_acft" className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white/50 transition-all font-semibold appearance-none cursor-pointer">
                    <option value="MONT-T" className="dark:bg-zinc-900">MONT-T (Monomotor Terrestre)</option>
                    <option value="MULT-T" className="dark:bg-zinc-900">MULT-T (Multimotor Terrestre)</option>
                    <option value="MONT-H" className="dark:bg-zinc-900">MONT-H (Monomotor Hidroavión)</option>
                    <option value="MULT-H" className="dark:bg-zinc-900">MULT-H (Multimotor Hidroavión)</option>
                  </select>
                </div>
              </div>

              <Continuar isPending={isPending} texto="Agregar aeronave" />
              <Omitir onClick={() => { setError(null); setPaso(3); }} disabled={isPending} />
            </form>
          )}

          {paso === 3 && (
            <div className="space-y-6">
              {/*
                Arranca colapsado a propósito: son 12 campos numéricos en el primer
                minuto de uso, y este overlay ya perdía gente con dos. El que no
                trae horas de antes ve un botón, no una grilla.
              */}
              {mostrarSaldo ? (
                <OpeningBalanceFields
                  opening={opening}
                  setField={setField}
                  descripcion="Va por categoría y no como un total suelto: es lo que permite que el desglose ANAC y el seguimiento de licencia sigan siendo correctos."
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarSaldo(true)}
                  className="w-full border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl py-5 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  Cargar saldo inicial
                </button>
              )}

              <button
                type="button"
                onClick={paso3}
                disabled={isPending}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm py-5 rounded-2xl shadow-cal-highlight dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <span>{openingTotal(opening) > 0 ? "Guardar y empezar" : "Empezar"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <Omitir onClick={() => setIsOpen(false)} disabled={isPending} texto="Lo cargo después" />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Campo({ label, name, placeholder, uppercase }: { label: string; name: string; placeholder: string; uppercase?: boolean }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">{label}</label>
      <input
        name={name}
        required
        placeholder={placeholder}
        className={`w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-zinc-900 dark:focus:border-white/50 transition-all text-zinc-900 dark:text-white font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ${uppercase ? "uppercase" : ""}`}
      />
    </div>
  );
}

function Continuar({ isPending, texto }: { isPending: boolean; texto: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={isPending}
      type="submit"
      className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm py-5 rounded-2xl shadow-cal-highlight dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-3"
    >
      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><span>{texto}</span><ArrowRight className="w-4 h-4" /></>)}
    </motion.button>
  );
}

function Omitir({ onClick, disabled, texto = "Omitir por ahora" }: { onClick: () => void; disabled: boolean; texto?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50"
    >
      {texto}
    </button>
  );
}
