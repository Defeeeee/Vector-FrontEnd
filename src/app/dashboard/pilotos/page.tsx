import Link from "next/link";
import { Suspense } from "react";
import { UserRound } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import AvisoNoSePudo from "@/components/social/AvisoNoSePudo";
import ComposerPublicacion from "@/components/social/ComposerPublicacion";
import CrearHandleRapido from "@/components/social/CrearHandleRapido";
import ListaPublicaciones from "@/components/social/ListaPublicaciones";
import PilotosSugeridos from "@/components/social/PilotosSugeridos";
import { rutaPerfilApp } from "@/lib/handle";
import { leerMiPerfilPublico, leerPublicaciones, leerVuelosParaCompartir } from "@/lib/publicaciones-servidor";
import { leerDatosParaElHandle, leerResumenSocial } from "@/lib/resumen-social";

export const metadata = { title: "Red | Vector" };

/**
 * La Red: lo que publican los pilotos que seguís, y lo tuyo.
 *
 * - **Sin @**, el @ se crea acá mismo (`CrearHandleRapido`) y abajo hay pilotos para
 *   mirar; seguirlos pide el @, que está arriba.
 * - **Con @**, arriba se escribe (el composer arranca cerrado, como una línea) y abajo va
 *   el feed, de a quince. Si hay poco para ver, sugiere a quién seguir.
 */
export default async function PaginaRed() {
  const resumen = await leerResumenSocial();

  if (!resumen.disponible) {
    return (
      <div className="space-y-8 w-full max-w-2xl mx-auto animate-in fade-in duration-700">
        <PageHeader eyebrow="La red de pilotos de Vector" title="Red" />
        <AvisoNoSePudo texto="No pudimos cargar la Red." />
      </div>
    );
  }

  if (!resumen.handle) {
    const datos = await leerDatosParaElHandle();
    return (
      <div className="space-y-6 md:space-y-8 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PageHeader eyebrow="La red de pilotos de Vector" title="Red" />
        <div id="crear-handle" className="scroll-mt-24">
          <CrearHandleRapido nombreSugerido={datos.nombre} licenciaSugerida={datos.licencia} />
        </div>
        <Suspense fallback={null}>
          <PilotosSugeridos tieneHandle={false} />
        </Suspense>
      </div>
    );
  }

  const [lectura, vuelos, perfil] = await Promise.all([
    leerPublicaciones({ tipo: "red" }),
    leerVuelosParaCompartir(),
    leerMiPerfilPublico(),
  ]);

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        eyebrow="Lo que publican los pilotos que seguís"
        title="Red"
        action={
          <Link
            href={rutaPerfilApp(resumen.handle)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <UserRound className="w-4 h-4" />
            Mi perfil
          </Link>
        }
      />

      <ComposerPublicacion
        compacto
        alPublicar="refrescar"
        autor={{
          handle: resumen.handle,
          nombre: perfil?.nombre_visible ?? resumen.handle,
          avatarUrl: resumen.avatar_url,
        }}
        vuelos={vuelos}
      />

      {lectura.disponible ? (
        <ListaPublicaciones
          inicial={lectura.publicaciones}
          siguiente={lectura.siguiente}
          origen={{ tipo: "red" }}
          contexto={{ modo: "app", interaccion: "completa" }}
          vacio={
            <div className="rounded-[2rem] border border-dashed border-zinc-300 dark:border-white/15 p-8 text-center space-y-1.5">
              <p className="font-display font-bold text-lg text-zinc-900 dark:text-white">Tu Red está vacía</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Contá tu último vuelo arriba, o{" "}
                <Link
                  href="/dashboard/pilotos/buscar"
                  className="font-semibold text-zinc-900 dark:text-white underline underline-offset-2"
                >
                  buscá pilotos para seguir
                </Link>
                .
              </p>
            </div>
          }
        />
      ) : (
        <AvisoNoSePudo texto="No pudimos cargar las publicaciones." />
      )}

      {/* Con poco para ver, a quién seguir. Por `Suspense`: el feed no lo espera. */}
      {lectura.disponible && lectura.publicaciones.filter((p) => !p.es_mia).length < 5 && (
        <Suspense fallback={null}>
          <PilotosSugeridos tieneHandle />
        </Suspense>
      )}
    </div>
  );
}
