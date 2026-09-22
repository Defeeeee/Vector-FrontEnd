import { AtSign, Check, X } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api";
import FilaPiloto from "@/components/social/FilaPiloto";
import AccionSocial from "@/components/social/AccionSocial";
import Link from "next/link";
import { Actividad, ResumenSocial, PilotoResumen } from "@/types";

export const metadata = { title: "Actividad | Vector" };

export default async function ActividadPage() {
  const resumenRes = await apiFetch("/social/resumen", { cache: "no-store" });
  const resumen: ResumenSocial = resumenRes.ok
    ? await resumenRes.json()
    : { handle: null, solicitudes_pendientes: 0, actividad_nueva: 0 };
  const handle = resumen.handle;

  if (!handle) {
    return (
      <div className="space-y-8 w-full animate-in fade-in duration-700">
        <PageHeader eyebrow="Actividad y notificaciones" title="Actividad" />
        <Link
          href="/dashboard/settings#perfil-publico"
          className="group flex items-center gap-4 rounded-[2rem] border border-dashed border-zinc-300 dark:border-white/15 bg-white dark:bg-white/[0.02] p-5 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
        >
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
            <AtSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Elegí tu @</p>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Para ver tu actividad, tenés que crear tu perfil primero.</p>
          </div>
        </Link>
      </div>
    );
  }

  const [actividadRes, pendientesRes] = await Promise.all([
    apiFetch("/social/actividad", { cache: "no-store" }),
    apiFetch("/social/pendientes", { cache: "no-store" }),
    apiFetch("/social/actividad/vista", { method: "POST", cache: "no-store" }), // Limpiar punto rojo
  ]);

  const actividad: Actividad = actividadRes.ok ? await actividadRes.json() : { eventos: [] };
  const pendientes: PilotoResumen[] = pendientesRes.ok ? await pendientesRes.json() : [];

  return (
    <div className="space-y-8 w-full max-w-2xl animate-in fade-in duration-700">
      <PageHeader eyebrow="Solicitudes y notificaciones" title="Actividad" />

      {pendientes.length > 0 && (
        <section className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white">Solicitudes pendientes</h3>
            <span className="data text-sm font-bold text-orange-500">{pendientes.length}</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-white/10">
            {pendientes.map((p) => (
              <FilaPiloto key={p.handle} piloto={p} accion={<AccionSocial tipo="solicitud" handle={p.handle} miHandle={handle} />} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5">
        <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white mb-4">Última actividad</h3>
        
        {actividad.eventos.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3">No hay actividad reciente en tu perfil.</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/10">
            {actividad.eventos.map((e, idx) => (
              <div key={idx} className={`py-3 flex items-start gap-3 ${e.nuevo ? 'bg-zinc-50 dark:bg-white/5 -mx-5 px-5' : ''}`}>
                <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold">
                  {e.piloto.handle.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    <span className="font-semibold text-zinc-900 dark:text-white">{e.piloto.nombre_visible}</span>
                    {e.tipo === "seguidor" && " empezó a seguirte."}
                    {e.tipo === "solicitud" && " solicitó seguirte."}
                    {e.tipo === "aplauso" && " aplaudió tu publicación."}
                    {e.tipo === "comentario" && " comentó: " + e.texto}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {new Date(e.created_at).toLocaleDateString("es-AR", { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
