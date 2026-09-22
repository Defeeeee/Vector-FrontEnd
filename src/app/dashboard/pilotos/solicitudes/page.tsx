import Link from "next/link";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import FilaPiloto from "@/components/social/FilaPiloto";
import AccionSocial from "@/components/social/AccionSocial";
import type { PilotoResumen, ResumenSocial } from "@/types";

export const metadata = { title: "Solicitudes | Vector" };

/**
 * Quiénes pidieron seguirte. Sólo llegan si tu perfil es privado: a uno público se lo
 * sigue sin pedir permiso.
 */
export default async function SolicitudesPage() {
  const [resumenRes, solicitudesRes] = await Promise.all([
    apiFetch("/social/resumen", { cache: "no-store" }),
    apiFetch("/social/solicitudes", { cache: "no-store" }),
  ]);
  const resumen: ResumenSocial = resumenRes.ok
    ? await resumenRes.json()
    : { handle: null, solicitudes_pendientes: 0 };
  const solicitudes: PilotoResumen[] = solicitudesRes.ok ? await solicitudesRes.json() : [];

  return (
    <div className="space-y-8 md:space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader eyebrow="Quiénes quieren ver tus horas" title="Solicitudes" />

      <section className="rounded-[2rem] border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-cal dark:shadow-none p-5 md:p-6">
        {!resumen.handle ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3">
            Todavía no tenés @.{" "}
            <Link href="/dashboard/settings#perfil-publico" className="font-semibold text-zinc-900 dark:text-white underline underline-offset-2">
              Crealo en el Hangar
            </Link>{" "}
            para que otros pilotos puedan seguirte.
          </p>
        ) : solicitudes.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3">
            No tenés solicitudes pendientes. Llegan sólo si tu perfil es privado: a uno público se lo sigue sin pedir
            permiso.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/10">
            {solicitudes.map((p) => (
              <FilaPiloto
                key={p.handle}
                piloto={p}
                accion={<AccionSocial tipo="solicitud" handle={p.handle} miHandle={resumen.handle} />}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
