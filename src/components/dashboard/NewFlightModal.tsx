"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plane, X } from "lucide-react";
import { Aircraft } from "@/types";
import FlightLogForm from "./FlightLogForm";
import SinAeronaves from "./SinAeronaves";

/**
 * "Nuevo Vuelo" as a dialog over the current page.
 *
 * Mounted by the intercepting route at `dashboard/@modal/(.)log-flight`, which
 * is what lets the same URL be two things: a dialog when you get there from
 * inside the app, and the full page when you deep-link or refresh. That's why
 * closing is `router.back()` and not local state — the dialog *is* a history
 * entry, so the phone's back gesture dismisses it like any native sheet.
 *
 * The shape follows FlightDeck: fixed width rather than full-bleed, the close
 * control next to the title, and the actions pinned to the bottom of the
 * scroller. A modal says "quick action you'll close"; a full page says "long
 * form you have to complete" — and the logbook entry is the former.
 */
export default function NewFlightModal({
  aircraft,
  logbooks,
  initialData,
}: {
  aircraft: Aircraft[];
  logbooks?: import("@/types").Logbook[];
  initialData?: Record<string, unknown>;
}) {
  const router = useRouter();
  const close = () => router.back();

  // Sin aeronaves no hay formulario que completar. El branch va acá y no en la
  // ruta que monta este modal, porque el chrome —cierre, título, gesto de
  // volver— tiene que quedar: lo que cambia es el cuerpo, no el diálogo.
  //
  // El mismo caso está resuelto en `/dashboard/log-flight/page.tsx`. Si tocás
  // uno, tocá el otro: este par ya derivó una vez.
  const sinAeronaves = aircraft.length === 0;

  // Escape closes, and the page behind must not scroll while the dialog owns
  // the screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo vuelo"
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-0 md:p-6"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={close}
        className="absolute inset-0 bg-zinc-900/50 dark:bg-black/75 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
        className="relative z-10 w-full md:max-w-[930px] h-[100dvh] md:h-auto md:max-h-[88vh] bg-white dark:bg-[#0a0a0a] border-zinc-200 dark:border-white/10 md:border md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-3 md:gap-4 px-6 md:px-10 pt-6 md:pt-8 pb-4 shrink-0">
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-lg">
            <Plane className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
              Nuevo vuelo
            </h2>
            <p className="mt-1 text-xs md:text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">
              {sinAeronaves ? "Falta un paso previo" : "Operaciones de vuelo"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 pb-6 md:pb-10">
          {sinAeronaves ? (
            <SinAeronaves />
          ) : (
            <FlightLogForm aircraft={aircraft} logbooks={logbooks} initialData={initialData} inModal stickyActions onCancel={close} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
