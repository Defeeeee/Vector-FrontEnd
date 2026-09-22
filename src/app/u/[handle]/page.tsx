import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, Lock, Pencil, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/actions/auth";
import { conArroba, normalizarHandle, problemaDelHandle } from "@/lib/handle";
import { estadoHitos } from "@/lib/hitos";
import AvatarPiloto from "@/components/social/AvatarPiloto";
import BotonSeguir from "@/components/social/BotonSeguir";
import CompartirPerfil from "@/components/social/CompartirPerfil";
import PublicacionCard from "@/components/social/PublicacionCard";
import type { HorasPublicas, PilotoPublico, ResumenSocial, PaginaPublicaciones } from "@/types";

/**
 * El perfil público de un piloto: `/u/<handle>`.
 *
 * **Se abre sin cuenta**, por decisión de Federico: es el link que un piloto manda por
 * WhatsApp, y el que lo recibe puede no usar Vector. Por eso vive fuera de
 * `/dashboard` —el proxy no lo protege, sólo le renueva la sesión a quien la tenga— y
 * no lleva la barra de la app.
 *
 * **Lo que se ve lo decide el backend** (`GET /publico/pilotos/{handle}`), que sólo
 * devuelve agregados: el @, el nombre, la licencia, la bio, los contadores y cinco
 * números de horas, o `null` si el que mira no puede verlas. Esta página no tiene cómo
 * mostrar un vuelo, una ruta o una fecha: no los recibe.
 *
 * Se pide sin cache: la respuesta depende de quién mira, y el botón de seguir que
 * mostrara el estado de hace veinte segundos sería peor que un pedido de más.
 */

type Params = { params: Promise<{ handle: string }> };

function handleDe(crudo: string): string {
  try {
    return normalizarHandle(decodeURIComponent(crudo));
  } catch {
    return normalizarHandle(crudo);
  }
}

async function perfilAnonimo(handle: string): Promise<PilotoPublico | null> {
  if (problemaDelHandle(handle)) return null;
  const res = await apiFetch(`/publico/pilotos/${encodeURIComponent(handle)}`, { cache: "no-store" }, { anonimo: true });
  return res.ok ? ((await res.json()) as PilotoPublico) : null;
}

/**
 * Título y descripción de la vista previa. **Como anónimo**, igual que la imagen: es
 * lo que ve quien recibe el link, no quien lo abrió. Sin indexar: el perfil es para
 * compartir, no para aparecer en buscadores.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const handle = handleDe((await params).handle);
  const piloto = await perfilAnonimo(handle);
  if (!piloto) return { title: "Piloto no encontrado | Vector", robots: { index: false, follow: false } };

  const titulo = `${piloto.nombre_visible} (${conArroba(piloto.handle)}) | Vector`;
  const descripcion = piloto.horas
    ? `${piloto.horas.total.toFixed(1)} horas de vuelo en su bitácora de Vector.`
    : "Perfil de piloto en Vector.";
  return {
    title: titulo,
    description: descripcion,
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: descripcion, type: "profile" },
  };
}

export default async function PerfilPiloto({ params }: Params) {
  const handle = handleDe((await params).handle);
  // Un @ con formato imposible no existe: no hace falta preguntarle al backend.
  if (problemaDelHandle(handle)) notFound();
  const conSesion = !!(await getSessionToken());

  const [res, pubRes, resumenRes] = await Promise.all([
    apiFetch(`/publico/pilotos/${encodeURIComponent(handle)}`, { cache: "no-store" }),
    apiFetch(`/publico/pilotos/${encodeURIComponent(handle)}/publicaciones`, { cache: "no-store" }),
    conSesion ? apiFetch("/social/resumen", { cache: "no-store" }) : Promise.resolve(null),
  ]);

  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`No se pudo cargar el perfil (${res.status})`);

  const piloto = (await res.json()) as PilotoPublico;
  const publicacionesPage = pubRes.ok ? ((await pubRes.json()) as PaginaPublicaciones) : { publicaciones: [] };
  const resumen: ResumenSocial | null = resumenRes?.ok ? await resumenRes.json() : null;
  const esPropio = piloto.relacion === "propio";
  const anonimo = piloto.relacion === "anonimo";

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white">
      <header className="w-full border-b border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href={anonimo ? "/" : "/dashboard"} className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
              <Compass className="w-4 h-4" strokeWidth={2} />
            </span>
            <span className="text-lg font-bold font-display tracking-tight">Vector</span>
          </Link>
          <Link
            href={anonimo ? "/login" : "/dashboard/pilotos"}
            className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            {anonimo ? "Ingresar" : "Volver a Vector"}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-14 space-y-6">
        {/* Quién es ------------------------------------------------------------ */}
        <section className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <AvatarPiloto nombre={piloto.nombre_visible} tamano="lg" />
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight leading-tight break-words">
                {piloto.nombre_visible}
              </h1>
              <p className="flex flex-wrap items-center gap-2 font-mono text-sm text-zinc-500 dark:text-zinc-400">
                <span>{conArroba(piloto.handle)}</span>
                {piloto.licencia && (
                  <span className="rounded-full border border-zinc-200 dark:border-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                    {piloto.licencia}
                  </span>
                )}
                {piloto.visibilidad === "privado" && (
                  <span className="inline-flex items-center gap-1 text-[12px]">
                    <Lock className="w-3 h-3" /> Privado
                  </span>
                )}
              </p>
              {piloto.bio && <p className="text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">{piloto.bio}</p>}
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                <span className="data font-bold text-zinc-900 dark:text-white">{piloto.seguidores}</span>{" "}
                {piloto.seguidores === 1 ? "seguidor" : "seguidores"}
                <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                <span className="data font-bold text-zinc-900 dark:text-white">{piloto.siguiendo}</span> siguiendo
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {esPropio ? (
              <>
                <Link
                  href="/dashboard/settings#perfil-publico"
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-3 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar perfil
                </Link>
                <CompartirPerfil handle={piloto.handle} />
              </>
            ) : (
              <BotonSeguir
                handle={piloto.handle}
                relacion={piloto.relacion}
                visibilidad={piloto.visibilidad}
                tieneHandle={!!resumen?.handle}
              />
            )}
          </div>
          {esPropio && (
            <p className="mt-4 text-[13px] text-zinc-500 dark:text-zinc-400">
              Así ve tu perfil {piloto.visibilidad === "publico" ? "cualquiera con el link" : "quien te sigue"}.
            </p>
          )}
        </section>

        {/* Sus horas ----------------------------------------------------------- */}
        {piloto.horas ? (
          <Horas horas={piloto.horas} />
        ) : (
          <section className="rounded-[2rem] border border-dashed border-zinc-300 dark:border-white/15 bg-white dark:bg-white/[0.02] p-8 text-center space-y-2">
            <Lock className="w-6 h-6 mx-auto text-zinc-400" />
            <p className="font-display font-bold text-lg">Perfil privado</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {piloto.relacion === "pendiente"
                ? "Tu solicitud está pendiente. Cuando la acepte, vas a ver sus horas."
                : anonimo
                  ? `Creá tu cuenta en Vector para pedirle a ${conArroba(piloto.handle)} que te deje seguirlo.`
                  : `Seguí a ${conArroba(piloto.handle)} para ver sus horas.`}
            </p>
          </section>
        )}

        {/* Publicaciones ----------------------------------------------------------- */}
        {piloto.horas && publicacionesPage.publicaciones.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-white mb-4">Publicaciones</h2>
            <div className="space-y-4">
              {publicacionesPage.publicaciones.map(pub => (
                <PublicacionCard key={pub.id} publicacion={pub} />
              ))}
            </div>
          </section>
        )}

        {/* Para quien llegó por el link ------------------------------------------ */}
        {anonimo && (
          <section className="rounded-[2rem] bg-zinc-900 dark:bg-[#111111] border border-zinc-900 dark:border-white/10 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-4 mt-8">
            <div className="flex-1">
              <p className="font-display font-bold text-xl text-white">¿Sos piloto?</p>
              <p className="text-sm text-white/60 mt-1">
                Llevá tu bitácora en Vector: horas en formato ANAC, vencimientos y si podés volar hoy.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-2xl bg-white text-zinc-900 px-5 py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              Crear mi bitácora
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

function Horas({ horas }: { horas: HorasPublicas }) {
  const hitos = estadoHitos(horas.total);
  const [entero, decimal] = horas.total.toFixed(1).split(".");
  const detalle = [
    { label: "PIC", valor: horas.pic },
    { label: "Travesía", valor: horas.travesia },
    { label: "Noche", valor: horas.noche },
    { label: "Instrumentos", valor: horas.instrumentos },
  ];

  return (
    <section className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-6 md:p-8 space-y-6">
      <div>
        <p className="eyebrow">Horas de vuelo</p>
        <p className="flex items-end gap-1 mt-2">
          <span className="data text-6xl md:text-7xl font-bold leading-none">{entero}</span>
          <span className="data text-6xl md:text-7xl font-bold leading-none text-zinc-300 dark:text-zinc-700">.{decimal}</span>
          <span className="data text-lg font-medium text-zinc-400 ml-2 mb-1">hs</span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {detalle.map((d) => (
          <div key={d.label} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{d.label}</p>
            <p className="data text-2xl font-bold mt-1">{d.valor.toFixed(1)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {hitos.proximo !== null ? (
          <>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Próximo hito: {hitos.proximo} hs</span>
              <span className="data text-zinc-500 dark:text-zinc-400">faltan {hitos.faltan?.toFixed(1)}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-aviation-blue dark:bg-aviation-cyan"
                style={{ width: `${Math.round(hitos.avance * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm font-semibold">Pasó las 1000 horas.</p>
        )}
        {hitos.alcanzados.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hitos.alcanzados.map((h) => (
              <span
                key={h}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-white/10 px-2.5 py-1 text-[12px] font-semibold"
              >
                <Trophy className="w-3 h-3" />
                {h} hs
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
        Horas que el piloto cargó en su bitácora de Vector, sin simuladores y con las que trajo de su libro de papel. No
        es una certificación de ANAC.
      </p>
    </section>
  );
}
