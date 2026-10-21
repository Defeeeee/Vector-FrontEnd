import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import PasoMarcador from "@/components/dashboard/MarcadorCad";
import { vuelosParaElCad } from "@/lib/cad-servidor";
import type { BorradorCad } from "@/lib/cad";

export const dynamic = "force-dynamic";

const vuelos = (n: number) => (n === 1 ? "1 vuelo" : `${n} vuelos`);
const horas = (n: number) => n.toFixed(1);

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-4">
      <span className="data grid place-items-center w-8 h-8 rounded-full border border-zinc-200 dark:border-white/10 text-sm font-bold text-zinc-500 dark:text-zinc-400">
        {n}
      </span>
      <div className="space-y-3 pt-1 min-w-0">
        <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white">{titulo}</h3>
        {children}
      </div>
    </li>
  );
}

function Fila({ b, corregir }: { b: BorradorCad; corregir?: boolean }) {
  return (
    <li className="flex items-start gap-4 px-4 md:px-5 py-3">
      <span className="data text-xs text-zinc-500 dark:text-zinc-400 pt-0.5 w-20 shrink-0">{b.fecha}</span>
      <div className="min-w-0 flex-1">
        <p className="data text-sm font-bold text-zinc-900 dark:text-white truncate">{b.ruta || "Sin ruta"}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {[b.matricula, `${horas(b.horas)} h`, b.finalidad.toLowerCase()].filter(Boolean).join(", ")}
        </p>
        {corregir && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{b.problema}</p>}
      </div>
      {corregir && (
        <Link
          href={`/dashboard/history?editar=${encodeURIComponent(b.vectorId)}`}
          className="shrink-0 text-xs font-semibold text-aviation-blue dark:text-aviation-cyan hover:underline underline-offset-2 pt-0.5"
        >
          Corregir
        </Link>
      )}
    </li>
  );
}

const LISTA = "divide-y divide-zinc-100 dark:divide-white/5 rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden";

/**
 * "Pasar al CAD": los pasos para cargar los vuelos de Vector en el CAD de ANAC desde el
 * navegador del piloto (`lib/cad.ts`, `src/cad/puente.ts`). Cuelga de Bitácora → Vuelos.
 *
 * Arriba, en una frase y una barra, cuánto falta. Después los pasos, con el marcador como
 * lo único destacado, y abajo los vuelos: primero los que hay que corregir, que son los
 * únicos que piden algo.
 */
export default async function PasarAlCadPage() {
  const datos = await vuelosParaElCad();

  if (datos === null || datos.alumno) {
    return (
      <div className="space-y-8 pb-20 max-w-3xl">
        <PageHeader eyebrow="Bitácora" title="Pasar al CAD" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-prose">
          {datos === null
            ? "No pudimos leer tus vuelos. Probá de nuevo en un momento."
            : "El CAD es para pilotos con licencia. Como alumno, tus vuelos los certifica la escuela. Cuando rindas la PPA, desde acá los vas a poder pasar."}
        </p>
      </div>
    );
  }

  const listos = datos.borradores.filter((b) => !b.problema);
  const revisar = datos.borradores.filter((b) => b.problema);
  const total = datos.pasados + datos.borradores.length;
  const horasListas = listos.reduce((t, b) => t + b.horas, 0);
  const pct = (n: number) => `${total ? (100 * n) / total : 0}%`;

  const frase =
    total === 0
      ? "Todavía no cargaste vuelos en Vector."
      : datos.borradores.length === 0
        ? `Tus ${vuelos(total)} ya están en el CAD.`
        : `Te faltan pasar ${vuelos(datos.borradores.length)} al CAD.${revisar.length ? ` Hay ${revisar.length} para corregir antes.` : ""}`;

  return (
    <div className="space-y-10 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-3xl">
      <PageHeader eyebrow="Bitácora" title="Pasar al CAD" />

      <section className="space-y-3">
        <p className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white leading-snug max-w-prose">{frase}</p>
        {total > 0 && (
          <>
            <div
              className="flex h-2.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-white/5"
              role="img"
              aria-label={`${datos.pasados} en el CAD, ${listos.length} listos, ${revisar.length} para corregir`}
            >
              <span className="bg-emerald-500" style={{ width: pct(datos.pasados) }} />
              <span className="bg-aviation-blue dark:bg-aviation-cyan" style={{ width: pct(listos.length) }} />
              <span className="bg-amber-400" style={{ width: pct(revisar.length) }} />
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <li className="inline-flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="data font-bold text-zinc-900 dark:text-white">{datos.pasados}</span> en el CAD
              </li>
              <li className="inline-flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-aviation-blue dark:bg-aviation-cyan" />{" "}
                <span className="data font-bold text-zinc-900 dark:text-white">{listos.length}</span> listos ({horas(horasListas)} h)
              </li>
              {revisar.length > 0 && (
                <li className="inline-flex items-center gap-1.5">
                  <i className="w-2 h-2 rounded-full bg-amber-400" /> <span className="data font-bold text-zinc-900 dark:text-white">{revisar.length}</span> para corregir
                </li>
              )}
            </ul>
          </>
        )}
      </section>

      <ol className="space-y-8">
        <Paso n={1} titulo="Poné el marcador en tu barra de favoritos">
          <PasoMarcador />
        </Paso>
        <Paso n={2} titulo='Entrá al CAD y abrí "Registro horas vuelo"'>
          <a
            href="https://cad.anac.gob.ar/portalApp/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 dark:border-white/10 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5"
          >
            Abrir el CAD <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </Paso>
        <Paso n={3} titulo="Tocá el marcador y elegí qué cargar">
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-prose">
            Se abre un panel de Vector adentro del CAD, con tus vuelos: los que faltan, los que ya están y los que hay que corregir. A cada vuelo le
            ponés su autoridad certificante y su nombre; Vector te propone la última que usaste para esa finalidad. Antes de cargar podés ver
            exactamente lo que se manda.
          </p>
        </Paso>
        <Paso n={4} titulo="Hacé la declaración jurada en el CAD">
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-prose">
            Los vuelos quedan &quot;Pendiente de DDJJ&quot;. La declaración la hacés vos, en &quot;DDJJ de Horas de vuelo&quot;: revisalos antes,
            porque lo que se declara ahí es una declaración jurada.
          </p>
        </Paso>
      </ol>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-prose">
        Vector no ve tu contraseña de ANAC: carga desde tu sesión del CAD, en tu navegador.
      </p>

      {revisar.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white">Para corregir antes de pasar</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">El panel no los manda hasta que estén bien. Corregirlos abre el vuelo en la bitácora.</p>
          </div>
          <ul className={LISTA}>
            {revisar.map((b) => (
              <Fila key={b.vectorId} b={b} corregir />
            ))}
          </ul>
        </section>
      )}

      {listos.length > 0 && (
        <details className="group space-y-3">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-[15px] font-bold text-zinc-900 dark:text-white [&::-webkit-details-marker]:hidden">
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform -rotate-90 group-open:rotate-0" aria-hidden="true" />
            Listos para pasar <span className="data text-sm font-medium text-zinc-500 dark:text-zinc-400">{listos.length}</span>
          </summary>
          <ul className={LISTA}>
            {listos.map((b) => (
              <Fila key={b.vectorId} b={b} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
