import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";
import { AuditSummary, PilotDocument } from "@/types";
import { documentStatus } from "@/lib/utils";

/**
 * Dashboard pair: logbook consistency on the left, expiries on the right.
 *
 * Both are "things that are wrong and you can't see from the flight list", so
 * they share a row and a visual language: a headline count, a one-line verdict,
 * and a link into the page that can actually fix it. A server component —
 * nothing here is interactive, and both datasets already ride along in the
 * consolidated /dashboard response.
 */
export default function LogbookHealthCard({
  audit,
  documents,
  documentosDisponibles = true,
}: {
  audit: AuditSummary;
  documents: PilotDocument[];
  /** `false` si la consulta de documentos falló: acá no hay "no hay". */
  documentosDisponibles?: boolean;
}) {
  const clean = audit.open_total === 0;

  // Los que no vencen van al final del orden y no cuentan como urgentes: no hay
  // cuenta regresiva que mostrar ni nada que renovar.
  const ranked = documents
    .map((doc) => ({ doc, status: documentStatus(doc.expiry_date) }))
    .sort((a, b) => (a.status.daysRemaining ?? Infinity) - (b.status.daysRemaining ?? Infinity));

  const urgent = ranked.filter((d) => d.status.tone !== "ok" && d.status.tone !== "sin_vencimiento");
  // El próximo a vencer sale sólo de los que efectivamente vencen. Con todos los
  // documentos sin fecha, no hay "próximo" y la card lo dice en vez de inventar
  // un número.
  const next = ranked.find((d) => d.status.daysRemaining !== null);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <Card
        href="/dashboard/audit"
        icon={<ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-white dark:text-zinc-900" />}
        title="Salud del logbook"
        cta="Ver auditoría"
      >
        {clean ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Sin observaciones</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Ninguna regla encontró inconsistencias.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-6">
            <Metric value={audit.critical} label="Críticas" tone={audit.critical > 0 ? "bad" : "muted"} />
            <Metric value={audit.warning} label="Advertencias" tone={audit.warning > 0 ? "warn" : "muted"} />
            {audit.suppressed > 0 && <Metric value={audit.suppressed} label="Suprimidas" tone="muted" />}
          </div>
        )}
      </Card>

      <Card
        href="/dashboard/settings"
        icon={<CalendarClock className="w-4 h-4 md:w-5 md:h-5 text-white dark:text-zinc-900" />}
        title="Vencimientos"
        cta="Gestionar"
      >
        {!documentosDisponibles ? (
          // Con la consulta caída, `documents` está vacía por no haber podido
          // preguntar. "No hay documentos cargados" sería inventar la respuesta.
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No pudimos cargar tus vencimientos. Probá recargar la página.
          </p>
        ) : documents.length === 0 ? (
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No hay documentos cargados. Agregá el CMA y la licencia para recibir avisos.
          </p>
        ) : !next ? (
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {documents.length === 1 ? "Tu documento no vence" : "Ninguno de tus documentos vence"}.
            No hay nada por renovar.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl md:text-4xl font-bold data leading-none ${
                  next.status.tone === "ok"
                    ? "text-zinc-900 dark:text-white"
                    : next.status.tone === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {(next.status.daysRemaining ?? 0) < 0 ? "0" : next.status.daysRemaining}
              </span>
              <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
                {(next.status.daysRemaining ?? 0) < 0 ? "días — vencido" : "días para el próximo"}
              </span>
            </div>

            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
              {next.doc.name} · {next.status.label.toLowerCase()}
            </p>

            {urgent.length > 1 && (
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {urgent.length} documentos necesitan atención
              </p>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

function Card({
  href,
  icon,
  title,
  cta,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group bg-white dark:bg-white/[0.02] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none hover:shadow-lg dark:hover:bg-white/[0.04] transition-all flex flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg shrink-0">
            {icon}
          </div>
          <h3 className="text-base md:text-lg font-bold font-display text-zinc-900 dark:text-white tracking-tight">
            {title}
          </h3>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
          {cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="flex-1 flex items-center">{children}</div>
    </Link>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone: "bad" | "warn" | "muted" }) {
  const toneClasses = {
    bad: "text-red-600 dark:text-red-400",
    warn: "text-amber-600 dark:text-amber-400",
    muted: "text-zinc-300 dark:text-zinc-600",
  }[tone];

  return (
    <div>
      <p className={`text-3xl md:text-4xl font-bold data leading-none ${toneClasses}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</p>
    </div>
  );
}
