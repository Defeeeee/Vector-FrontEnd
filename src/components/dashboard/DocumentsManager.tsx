"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { DocumentKind, PilotDocument } from "@/types";
import { documentStatus } from "@/lib/utils";
import { createDocument, deleteDocument, updateDocument } from "@/actions/document";
import StyledSelect from "./StyledSelect";

const KIND_OPTIONS: { value: DocumentKind; label: string }[] = [
  { value: "cma", label: "Certificado médico (CMA)" },
  { value: "licencia", label: "Licencia" },
  { value: "habilitacion", label: "Habilitación" },
  { value: "seguro", label: "Seguro" },
  { value: "aeronavegabilidad", label: "Aeronavegabilidad" },
  { value: "otro", label: "Otro" },
];

const KIND_LABEL = Object.fromEntries(KIND_OPTIONS.map((k) => [k.value, k.label])) as Record<DocumentKind, string>;

const TONE_STYLES = {
  expired: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
  critical: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
  warning: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  ok: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
} as const;

export default function DocumentsManager({
  documents,
  todayIso,
}: {
  documents: PilotDocument[];
  /**
   * "Today" as decided by the server, in YYYY-MM-DD.
   *
   * Letting this component call `new Date()` would mean SSR and hydration can
   * land on different calendar days — the server runs in UTC while the pilot's
   * browser is at UTC-3, so any evening after 21:00 local the two disagree and
   * every "vence en N días" badge mismatches.
   */
  todayIso: string;
}) {
  const today = new Date(`${todayIso}T00:00:00Z`);
  const [editing, setEditing] = useState<PilotDocument | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = (doc: PilotDocument) => {
    if (!confirm(`¿Borrar "${doc.name}"?`)) return;
    setBusyId(doc.id);
    setError(null);
    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if (result?.error) setError(result.error);
      setBusyId(null);
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {documents.length === 0 && !adding && (
          <div className="bg-white dark:bg-white/[0.02] p-6 md:p-10 rounded-[2rem] text-center border border-dashed border-zinc-200 dark:border-white/10">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
              No hay documentos cargados. Agregá el CMA, la licencia o cualquier cosa que venza.
            </p>
          </div>
        )}

        {documents.map((doc) => {
          const status = documentStatus(doc.expiry_date, today);
          const isEditing = editing?.id === doc.id;

          if (isEditing) {
            return (
              <DocumentForm
                key={doc.id}
                document={doc}
                onCancel={() => setEditing(null)}
                onDone={() => setEditing(null)}
                onError={setError}
              />
            );
          }

          return (
            <div
              key={doc.id}
              className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-none p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">{doc.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400">
                    {KIND_LABEL[doc.kind] ?? doc.kind}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {new Date(`${doc.expiry_date}T00:00:00`).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  {doc.notes ? ` · ${doc.notes}` : ""}
                </p>
              </div>

              <span
                className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border ${TONE_STYLES[status.tone]}`}
              >
                {status.label}
              </span>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(doc)}
                  aria-label={`Editar ${doc.name}`}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={pending && busyId === doc.id}
                  onClick={() => remove(doc)}
                  aria-label={`Borrar ${doc.name}`}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {pending && busyId === doc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <DocumentForm onCancel={() => setAdding(false)} onDone={() => setAdding(false)} onError={setError} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-white/30 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar documento
        </button>
      )}
    </div>
  );
}

function DocumentForm({
  document: doc,
  onCancel,
  onDone,
  onError,
}: {
  document?: PilotDocument;
  onCancel: () => void;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const [kind, setKind] = useState<string>(doc?.kind ?? "otro");
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    onError(null);
    startTransition(async () => {
      const result = doc ? await updateDocument(doc.id, formData) : await createDocument(formData);
      if (result?.error) {
        onError(result.error);
        return;
      }
      onDone();
    });
  };

  return (
    <form
      action={submit}
      className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-zinc-900/20 dark:border-white/20 shadow-cal dark:shadow-none p-5 md:p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
          {doc ? "Editar documento" : "Nuevo documento"}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Tipo
          </label>
          <StyledSelect name="kind" value={kind} onChange={setKind} options={KIND_OPTIONS} />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Nombre
          </label>
          <input
            name="name"
            required
            defaultValue={doc?.name ?? ""}
            placeholder="ej. Certificado Médico Aeronáutico"
            className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-white/10 py-2 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Vence el
          </label>
          <input
            name="expiry_date"
            type="date"
            required
            defaultValue={doc?.expiry_date ?? ""}
            className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-white/10 py-2 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-colors [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Avisar a los (días)
          </label>
          <input
            name="alert_days"
            defaultValue={(doc?.alert_days ?? [60, 30, 7]).join(", ")}
            placeholder="60, 30, 7"
            className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-white/10 py-2 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
          Nota (opcional)
        </label>
        <input
          name="notes"
          defaultValue={doc?.notes ?? ""}
          placeholder="ej. Clase 2, Dr. Pérez"
          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-white/10 py-2 text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-opacity disabled:opacity-50"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
          {doc ? "Guardar cambios" : "Agregar"}
        </button>
        <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          Si tenés WhatsApp configurado, el aviso llega por ahí.
        </p>
      </div>
    </form>
  );
}
