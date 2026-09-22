import PageHeader from "@/components/dashboard/PageHeader";
import ComposerPublicacion from "@/components/social/ComposerPublicacion";
import { apiFetch } from "@/lib/api";
import { ResumenSocial } from "@/types";
import Link from "next/link";
import { AtSign } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Publicar | Vector" };

export default async function PublicarPage() {
  const resumenRes = await apiFetch("/social/resumen", { cache: "no-store" });
  const resumen: ResumenSocial = resumenRes.ok
    ? await resumenRes.json()
    : { handle: null, solicitudes_pendientes: 0, actividad_nueva: 0 };
  const handle = resumen.handle;

  if (!handle) {
    return (
      <div className="space-y-8 w-full animate-in fade-in duration-700">
        <PageHeader eyebrow="Compartí con tu red" title="Publicar" />
        <Link
          href="/dashboard/settings#perfil-publico"
          className="group flex items-center gap-4 rounded-[2rem] border border-dashed border-zinc-300 dark:border-white/15 bg-white dark:bg-white/[0.02] p-5 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
        >
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
            <AtSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Elegí tu @</p>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Para publicar en la red, tenés que crear tu perfil primero.</p>
          </div>
        </Link>
      </div>
    );
  }

  const perfilRes = await apiFetch(`/publico/pilotos/${handle}`, { cache: "no-store" }, { anonimo: true });
  const perfilInfo = perfilRes.ok ? await perfilRes.json() : null;

  return (
    <div className="space-y-8 w-full max-w-2xl mx-auto animate-in fade-in duration-700">
      <PageHeader eyebrow="Nueva publicación" title="Publicar" />
      <ComposerPublicacion
        avatarUrl={resumen.avatar_url}
        nombre={perfilInfo?.nombre_visible || "Piloto"}
      />
    </div>
  );
}
