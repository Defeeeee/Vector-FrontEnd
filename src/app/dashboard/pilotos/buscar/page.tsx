import Link from "next/link";
import { ArrowRight, AtSign } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import BuscadorPilotos from "@/components/social/BuscadorPilotos";
import FilaPiloto from "@/components/social/FilaPiloto";
import BotonSeguir from "@/components/social/BotonSeguir";
import AccionSocial from "@/components/social/AccionSocial";
import CompartirPerfil from "@/components/social/CompartirPerfil";
import { conArroba, rutaPerfil } from "@/lib/handle";
import type { PilotoResumen, ResumenSocial } from "@/types";

export const metadata = { title: "Pilotos | Vector" };

/**
 * La red: buscar pilotos, a quién seguís y quién te sigue.
 *
 * Buscar anda aunque todavía no tengas @ —encontrar a alguien no le cuenta nada de
 * vos—, pero para seguir hace falta: el otro tiene que poder ver quién es.
 */
async function lista(ruta: string): Promise<PilotoResumen[]> {
  const res = await apiFetch(ruta, { cache: "no-store" });
  return res.ok ? ((await res.json()) as PilotoResumen[]) : [];
}

export default async function PilotosPage() {
  const resumenRes = await apiFetch("/social/resumen", { cache: "no-store" });
  const resumen: ResumenSocial = resumenRes.ok
    ? await resumenRes.json()
    : { handle: null, solicitudes_pendientes: 0 };
  const handle = resumen.handle;

  const [siguiendo, seguidores] = handle
    ? await Promise.all([lista("/social/siguiendo"), lista("/social/seguidores")])
    : [[], []];

  return (
    <div className="space-y-8 md:space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader eyebrow="La red de pilotos de Vector" title="Pilotos" />

      {handle ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-5 md:p-6">
          <div className="flex-1 min-w-0">
            <p className="eyebrow">Tu perfil</p>
            <Link
              href={rutaPerfil(handle)}
              className="font-mono text-lg font-semibold text-zinc-900 dark:text-white hover:underline underline-offset-2"
            >
              {conArroba(handle)}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompartirPerfil handle={handle} compacto />
            <Link
              href={rutaPerfil(handle)}
              className="inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              Ver cómo te ven
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <Link
          href="/dashboard/settings#perfil-publico"
          className="group flex items-center gap-4 rounded-[2rem] border border-dashed border-zinc-300 dark:border-white/15 bg-white dark:bg-white/[0.02] p-5 md:p-6 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
            <AtSign className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Elegí tu @</p>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
              Para aparecer en la red, seguir a otros pilotos y compartir tus horas con un link.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
        </Link>
      )}

      <BuscadorPilotos tieneHandle={!!handle} />

      {handle && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Lista titulo="Siguiendo" vacio="Todavía no seguís a nadie. Buscá a alguien arriba.">
            {siguiendo.map((p) => (
              <FilaPiloto
                key={p.handle}
                piloto={p}
                accion={
                  <BotonSeguir handle={p.handle} relacion={p.relacion} visibilidad={p.visibilidad} tieneHandle compacto />
                }
              />
            ))}
          </Lista>
          <Lista titulo="Seguidores" vacio="Nadie te sigue todavía. Compartí tu perfil para empezar.">
            {seguidores.map((p) => (
              <FilaPiloto key={p.handle} piloto={p} accion={<AccionSocial tipo="seguidor" handle={p.handle} miHandle={handle} />} />
            ))}
          </Lista>
        </div>
      )}
    </div>
  );
}

function Lista({ titulo, vacio, children }: { titulo: string; vacio: string; children: React.ReactNode[] }) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-5 md:p-6">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white tracking-tight">{titulo}</h3>
        <span className="data text-sm font-bold text-zinc-400 dark:text-zinc-500">{children.length}</span>
      </div>
      {children.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3">{vacio}</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-white/10">{children}</div>
      )}
    </section>
  );
}
