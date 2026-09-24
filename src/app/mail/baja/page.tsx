import type { Metadata } from "next";
import Link from "next/link";
import { MailX } from "lucide-react";
import { firmaValida } from "@/lib/baja-mail";

export const metadata: Metadata = { title: "Resumen del mes · Vector", robots: { index: false } };

/**
 * La página del link "No recibirlo más" del resumen del mes.
 *
 * Mirarla no cambia nada: la baja es el botón, que hace POST (ver `api/mail/baja`). Sin
 * sesión, con el link firmado del mail.
 */
export default async function BajaResumen({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; hecho?: string }>;
}) {
  const { u = "", t = "", hecho } = await searchParams;
  const valido = firmaValida(u, t, process.env.DOCUMENTS_ALERT_SECRET ?? "");
  const accion = (volver: boolean) =>
    `/api/mail/baja?${new URLSearchParams({ u, t, desde: "pagina", ...(volver ? { volver: "1" } : {}) })}`;

  let titulo = "¿Dejar de recibir el resumen del mes?";
  let texto = "Es el mail que te llega el día 1 con tus horas, lo que te falta para la próxima licencia y tu saldo. Los avisos de vencimientos y el briefing del vuelo siguen igual.";
  let boton: { label: string; volver: boolean } | null = { label: "No recibirlo más", volver: false };

  if (!valido) {
    titulo = "Este link no es válido";
    texto = "Puede estar cortado. Abrí el link desde el último mail del resumen.";
    boton = null;
  } else if (hecho === "baja") {
    titulo = "Listo, no te lo mandamos más";
    texto = "Si te arrepentís, lo podés volver a activar desde acá.";
    boton = { label: "Volver a recibirlo", volver: true };
  } else if (hecho === "alta") {
    titulo = "Listo, te lo volvemos a mandar";
    texto = "Te llega el primer día de cada mes.";
    boton = null;
  } else if (hecho === "error") {
    titulo = "No pudimos guardarlo";
    texto = "Probá de nuevo en un rato.";
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col items-center justify-center text-center px-6 space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
        <MailX className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-display font-bold tracking-tight">{titulo}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{texto}</p>
      </div>
      {boton && (
        <form method="post" action={accion(boton.volver)}>
          <button type="submit" className="px-6 py-3 rounded-full bg-aviation-blue text-white text-sm font-bold">
            {boton.label}
          </button>
        </form>
      )}
      <Link href="/dashboard" className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 underline underline-offset-4">
        Ir a Vector
      </Link>
    </div>
  );
}
