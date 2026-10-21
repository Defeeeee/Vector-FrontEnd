import { ExternalLink } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import MarcadorCad from "@/components/dashboard/MarcadorCad";
import { vuelosParaElCad } from "@/lib/cad-servidor";

export const dynamic = "force-dynamic";

/**
 * "Pasar al CAD": los pasos para cargar los vuelos de Vector en el CAD de ANAC desde el
 * navegador del piloto (`lib/cad.ts`, `src/cad/puente.ts`). Cuelga de Bitácora → Vuelos.
 */
export default async function PasarAlCadPage() {
  const datos = await vuelosParaElCad();
  const listos = datos?.borradores.filter((b) => !b.problema) ?? [];
  const revisar = datos?.borradores.filter((b) => b.problema) ?? [];

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-3xl">
      <PageHeader eyebrow="Bitácora" title="Pasar al CAD" />

      {datos === null ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No pudimos leer tus vuelos. Probá de nuevo en un momento.</p>
      ) : datos.alumno ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          El CAD es para pilotos con licencia. Como alumno, tus vuelos los certifica la escuela. Cuando rindas la PPA, desde acá los vas a poder
          pasar.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { n: datos.borradores.length, t: "sin pasar al CAD" },
              { n: listos.length, t: "listos para mandar" },
              { n: datos.pasados, t: "ya anotados" },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4">
                <p className="data text-2xl font-bold text-zinc-900 dark:text-white">{c.n}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.t}</p>
              </div>
            ))}
          </div>

          <ol className="space-y-6">
            <li className="space-y-3">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">1. Arrastrá este botón a la barra de favoritos</p>
              <MarcadorCad />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Una sola vez. Funciona en la computadora (Chrome, Edge, Firefox, Safari). Si no ves la barra de favoritos, mostrala con Ctrl+Shift+B
                (⌘+Shift+B en Mac).
              </p>
            </li>
            <li className="space-y-3">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">2. Entrá al CAD y abrí &quot;Registro horas vuelo&quot;</p>
              <a
                href="https://cad.anac.gob.ar/portalApp/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-zinc-200 dark:border-white/10 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Abrir el CAD <ExternalLink className="w-4 h-4" />
              </a>
            </li>
            <li className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">3. Tocá el marcador</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Se abre una ventanita de Vector y, adentro del CAD, un panel con tus vuelos: cuáles faltan, cuáles ya están y cuáles hay que revisar.
                Elegís la autoridad certificante, y Vector los carga. Si querés, antes ves exactamente lo que se manda.
              </p>
            </li>
            <li className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">4. Hacé la declaración jurada en el CAD</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Los vuelos quedan &quot;Pendiente de DDJJ&quot;. La declaración la hacés vos, en &quot;DDJJ de Horas de vuelo&quot;, como siempre.
              </p>
            </li>
          </ol>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Vector no ve tu contraseña de ANAC: carga desde tu sesión del CAD, en tu navegador. Lo que se declara en el CAD es una declaración jurada;
            revisá los vuelos antes de hacerla.
          </p>

          {revisar.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Para revisar antes ({revisar.length})</h3>
              <ul className="divide-y divide-zinc-100 dark:divide-white/5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                {revisar.slice(0, 20).map((b) => (
                  <li key={b.vectorId} className="px-4 py-3">
                    <p className="data text-sm font-bold text-zinc-900 dark:text-white">
                      {b.fecha} · {b.ruta}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">{b.problema}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
