import PageHeader from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api";
import { PaginaPublicaciones, ResumenSocial, PilotoResumen } from "@/types";
import ComposerPublicacion from "@/components/social/ComposerPublicacion";
import PublicacionCard from "@/components/social/PublicacionCard";
import TuRedCard from "@/components/social/TuRedCard";
import { enriquecerPublicacionesConMapa } from "@/lib/enriquecer-publicaciones";

export const metadata = { title: "Pilotos | Vector" };

export default async function PaginaRed() {
  const resumenRes = await apiFetch("/social/resumen", { cache: "no-store" });
  const resumen: ResumenSocial = resumenRes.ok
    ? await resumenRes.json()
    : { handle: null, solicitudes_pendientes: 0, actividad_nueva: 0 };
  const tieneHandle = !!resumen.handle;

  const [feedRes, perfilRes] = await Promise.all([
    apiFetch("/red/feed", { cache: "no-store" }),
    tieneHandle ? apiFetch(`/publico/pilotos/${resumen.handle}`, { cache: "no-store" }, { anonimo: true }) : Promise.resolve(null),
  ]);

  const feedBody = feedRes.ok ? await feedRes.json() : null;
  const perfilBody = perfilRes?.ok ? await perfilRes.json() : null;

  const publicaciones = feedBody ? enriquecerPublicacionesConMapa(feedBody.publicaciones || []) : [];

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader eyebrow="Lo último de los pilotos que seguís" title="Red" />

      {tieneHandle && (
        <ComposerPublicacion
          avatarUrl={resumen.avatar_url}
          nombre={perfilBody?.nombre_visible || "Piloto"}
        />
      )}

      {!tieneHandle && <TuRedCard tieneHandle={false} nuevaActividad={0} />}

      <div className="mt-8">
        {publicaciones.length > 0 ? (
          publicaciones.map(pub => (
            <PublicacionCard key={pub.id} publicacion={pub} />
          ))
        ) : (
          tieneHandle && (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <p>Tu feed está vacío.</p>
              <p className="mt-2 text-sm">Buscá a otros pilotos y empezá a seguirlos para ver sus vuelos.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
