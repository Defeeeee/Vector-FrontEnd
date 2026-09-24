"use client";

import { Profile } from "@/types";
import { conectarWhatsapp, updateProfile } from "@/actions/profile";
import { upsertCmaDocument } from "@/actions/document";
import { addAircraft } from "@/actions/flight";
import { createLogbook, OpeningBalanceInput } from "@/actions/logbook";
import { Calendar, CreditCard, ArrowRight, Loader2, Compass, Plane, BookOpen, MessageCircle, FileUp, Check } from "lucide-react";
import Link from "next/link";
import { linkCopiloto } from "@/lib/copiloto";
import { mostrarWhatsapp, normalizarWhatsapp } from "@/lib/whatsapp-numero";
import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { COOKIE_ALTA, pasoDelAlta, type EstadoAlta } from "@/lib/onboarding";
import { motion, AnimatePresence } from "framer-motion";
import OpeningBalanceFields, { openingTotal } from "./OpeningBalanceFields";

/**
 * El arranque, en tres pasos, **obligatorio** y **retomable**.
 *
 * **Desde el 2026-09-24, nada se saltea** (decisión de Federico). El overlay no se
 * cierra, no tiene "Omitir", tapa todas las pantallas del dashboard y, a quien no
 * terminó, lo devuelve al primer paso sin hacer cada vez que entra. El paso sale de
 * los datos (`GET /onboarding/estado`, `pasoDelAlta`), no de una marca: si alguien
 * cargó el avión desde el Hangar, el paso 2 ya está. La única pantalla que no tapa es
 * la de importar el libro en PDF, que es una de las formas de cerrar el paso 3.
 *
 * Lo que sigue es la historia de cuando todo era salteable, que se deja porque explica
 * por qué el paso 3 ofrece tres salidas:
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
  /** Lo que ya hizo. `null` si no se pudo leer: "no sé" no bloquea a nadie. */
  estado: EstadoAlta | null;
}

/** Terminó: esta cuenta no vuelve a preguntar en este navegador. Ver `COOKIE_ALTA`. */
function recordarAltaHecha(id: string | undefined) {
  if (id) document.cookie = `${COOKIE_ALTA}=${id}; path=/; max-age=31536000; samesite=lax`;
}

const INPUT =
  "w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-900 dark:focus:border-white/50 transition-all text-zinc-900 dark:text-white font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-600";

export default function OnboardingOverlay({ profile, estado }: OnboardingOverlayProps) {
  const [isPending, startTransition] = useTransition();
  // Se decide **una sola vez, al montar**. Antes se recalculaba en cada render con
  // `profile.license_type === "-"`, y el paso 1 guarda justamente la licencia: la server
  // action revalida `/dashboard`, el layout vuelve con el perfil nuevo, la condición da
  // falso y el overlay se cerraba solo. Los pasos 2 y 3 no los vio nadie (el 2026-09-23,
  // cuatro altas y ningún libro creado, que es lo que hace el paso 3).
  // Sin el estado (no se pudo leer), sólo se muestra a quien seguro no hizo nada: el
  // perfil recién creado, con la licencia en "-".
  const pasoInicial = estado ? pasoDelAlta(estado) : profile?.license_type === "-" ? 1 : null;
  const [isOpen, setIsOpen] = useState(() => pasoInicial !== null);
  const [paso, setPaso] = useState<1 | 2 | 3>(pasoInicial ?? 1);
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<OpeningBalanceInput>({});
  const [mostrarSaldo, setMostrarSaldo] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappGuardado, setWhatsappGuardado] = useState<string | null>(profile?.whatsapp_phone || null);

  // El estado vuelve del server después de cada paso (las acciones revalidan) o al volver
  // del importador. Si ya está completa, se cierra y se anota en la cookie; si avanzó por
  // otro lado (el avión cargado desde el Hangar), se salta al paso que corresponde. El
  // paso nunca retrocede: eso lo decide el piloto con lo que carga, no un render.
  const pasoDelServer = estado ? pasoDelAlta(estado) : undefined;
  useEffect(() => {
    if (pasoDelServer === null) {
      recordarAltaHecha(profile?.id);
      setIsOpen(false);
    } else if (pasoDelServer !== undefined) {
      setPaso((actual) => (pasoDelServer > actual ? pasoDelServer : actual));
    }
  }, [pasoDelServer, profile?.id]);

  if (!isOpen) return null;
  // El importador del PDF es una de las salidas del paso 3: ahí no se tapa.
  if (pathname?.startsWith("/dashboard/log-flight/import")) return null;

  const setField = (key: keyof OpeningBalanceInput, raw: string) =>
    setOpening((prev) => ({ ...prev, [key]: raw === "" ? undefined : Number(raw) }));

  function paso1(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const perfil = await updateProfile(formData);
        if (perfil?.error) {
          setError(perfil.error);
          return;
        }

        // Obligatorio desde el 2026-09-24, salvo que ya esté cargado (se retomó el paso
        // porque faltaba la licencia): en ese caso el campo no se pide.
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

  function conectar() {
    setError(null);
    startTransition(async () => {
      const r = await conectarWhatsapp(whatsapp);
      if (r.error) {
        setError(r.error);
        return;
      }
      setWhatsappGuardado(r.numero ?? null);
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
      recordarAltaHecha(profile?.id);
      setIsOpen(false);
    });
  }

  const titulos = {
    1: { icono: Compass, titulo: "Bienvenido a Vector", bajada: "Empecemos por tu licencia y el vencimiento de tu certificado médico." },
    2: { icono: Plane, titulo: "Tu primera aeronave", bajada: "Un vuelo se anota contra una aeronave. Cargá la que usás y ya podés registrar vuelos." },
    3: { icono: BookOpen, titulo: "Tus vuelos", bajada: "Tres formas de traer lo que volás. Elegí la que te quede más cómoda: podés usar todas." },
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
                    <input name="license_type" required defaultValue={profile?.license_type && profile.license_type !== "-" ? profile.license_type : "PPA"} placeholder="PPA, PCA, TLA..." className={`${INPUT} uppercase`} />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">
                    Vencimiento CMA {estado?.cma && <span className="text-zinc-400 dark:text-zinc-600">(ya cargado)</span>}
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
                      required={!estado?.cma}
                      className={`${INPUT} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Con el vencimiento, Vector te dice si podés volar y te avisa antes de que venza.
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
            </form>
          )}

          {paso === 3 && (
            <div className="space-y-6">
              {/*
                Antes este paso era sólo "¿Traés horas de antes?", con 12 campos detrás de
                un botón, y nadie lo usaba: el 2026-09-23 entraron cuatro pilotos y ninguno
                cargó un vuelo ni volvió. Ahora ofrece las tres formas de tener vuelos en
                Vector, empezando por la más barata: dejar el número y escribirle al
                copiloto. Ninguna es obligatoria (ver el encabezado del archivo).
              */}
              <div className="rounded-2xl border border-zinc-200 dark:border-white/10 p-5 space-y-4">
                <div className="flex gap-4">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">Cargá vuelos con un audio</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Al bajar del avión le mandás un audio al copiloto por WhatsApp y queda cargado.</p>
                  </div>
                </div>
                {whatsappGuardado ? (
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" strokeWidth={3} /> Conectado: {mostrarWhatsapp(whatsappGuardado)}
                    </p>
                    {linkCopiloto() ? (
                      <a
                        href={linkCopiloto()!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white font-semibold text-sm py-4"
                      >
                        <MessageCircle className="w-4 h-4" /> Escribirle al copiloto
                      </a>
                    ) : (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Listo: el copiloto de Vector va a reconocer los mensajes que le mandes desde ese número.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="Tu celular, ej. 11 2345 6789"
                        className="flex-1 min-w-0 bg-transparent border border-zinc-200 dark:border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-zinc-900 dark:focus:border-white/50 text-zinc-900 dark:text-white font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={conectar}
                        disabled={isPending || !whatsapp.trim() || !normalizarWhatsapp(whatsapp).ok}
                        className="shrink-0 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm px-5 disabled:opacity-40"
                      >
                        Conectar
                      </button>
                    </div>
                    {whatsapp.trim() && (() => {
                      const n = normalizarWhatsapp(whatsapp);
                      return (
                        <p className={`text-xs font-semibold ${n.ok ? "text-zinc-500 dark:text-zinc-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {n.ok ? `Se guarda como ${mostrarWhatsapp(n.numero)}` : n.error}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>

              <Link
                href="/dashboard/log-flight/import"
                className="flex gap-4 rounded-2xl border border-zinc-200 dark:border-white/10 p-5 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-aviation-blue/10 text-aviation-blue dark:text-aviation-cyan flex items-center justify-center shrink-0">
                  <FileUp className="w-5 h-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-zinc-900 dark:text-white">Importá tu libro en PDF</span>
                  <span className="block text-sm text-zinc-500 dark:text-zinc-400">Subí las hojas escaneadas de tu libro de papel y Vector carga los vuelos.</span>
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-400 self-center" />
              </Link>

              {/*
                El saldo inicial sigue acá, colapsado a propósito: son 12 campos numéricos
                en el primer minuto de uso. El que no trae horas de antes ve un botón.
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
                  Traigo horas de antes: cargar el saldo inicial
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
