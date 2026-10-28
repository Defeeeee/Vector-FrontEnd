import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { vuelosParaElCad } from "@/lib/cad-servidor";
import ConectorCad from "./ConectorCad";

export const metadata: Metadata = { title: "Vector → CAD", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * La ventanita que abre el marcador "Vector → CAD" desde la pestaña del CAD de ANAC
 * (`src/cad/puente.ts`). Tiene la sesión de Vector: le pasa al CAD los vuelos que faltan,
 * ya armados (`lib/cad.ts`), y marca en Vector los que el CAD confirma.
 *
 * Fuera del dashboard a propósito: es una ventana chica, sin barra ni alta. Mirar no
 * escribe (invariante 15): las marcas llegan sólo cuando el CAD avisa qué cargó.
 */
export default async function ConectorPage() {
  const sesion = (await cookies()).get("session_token");
  const datos = sesion ? await vuelosParaElCad() : null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 font-sans text-zinc-900 dark:text-white">
      <div className="max-w-sm mx-auto space-y-5">
        {!sesion ? (
          <>
            <h1 className="text-xl font-bold">Entrá a Vector</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Iniciá sesión en esta ventana y después volvé a tocar el marcador en el CAD.
            </p>
            <Link href="/login" className="inline-block rounded-full bg-zinc-900 text-white px-5 py-3 text-sm font-semibold">
              Entrar
            </Link>
          </>
        ) : !datos ? (
          <>
            <h1 className="text-xl font-bold">No pudimos leer tus vuelos</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Probá de nuevo en un momento, tocando otra vez el marcador.</p>
          </>
        ) : datos.alumno ? (
          <>
            <h1 className="text-xl font-bold">El CAD es para pilotos con licencia</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Como alumno, tus vuelos los certifica la escuela. Cuando rindas la PPA, desde acá los pasás al CAD.
            </p>
          </>
        ) : (
          <ConectorCad
            borradores={datos.borradores}
            pasados={datos.pasados}
            omitidos={datos.omitidos}
            conocidos={datos.conocidos}
            matriculas={datos.matriculas}
            enElCadSegunVector={datos.marcados}
            origenCad={process.env.NEXT_PUBLIC_CAD_ORIGEN || "https://cad.anac.gob.ar"} />
        )}
      </div>
    </main>
  );
}
