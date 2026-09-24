import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { enviarMail, mailConfigurado } from "@/lib/mailer";
import { armarMensajePrimerVuelo } from "@/lib/primer-vuelo-mail";
import { linkCopiloto } from "@/lib/copiloto";

// Local por defecto, con /api, como los otros barridos (ver `lib/api.ts`).
const API_URL = process.env.API_URL || "http://127.0.0.1:7477/api";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vector.fdiaznem.com.ar";

/**
 * El mail del día siguiente al alta, para quien todavía no cargó vuelos.
 *
 * Una vez por día, a la mañana, desde el crontab del server, como el briefing:
 *
 *   0 13 * * * ~/bin/vector-primer-vuelo.sh     # 10:00 ART
 *
 * El backend (`GET /onboarding/recordatorios`) dice a quién: los que se registraron
 * **ayer**, confirmaron el mail, no tienen vuelos y no recibieron este mail antes. Acá se
 * arma y se manda, y después se avisa a quiénes les llegó para marcarlos
 * (`POST /onboarding/recordatorios/enviados`). **A diferencia del briefing, correrlo dos
 * veces no manda dos mails:** el segundo pedido ya no los devuelve.
 *
 * Sin proveedor de correo no falla: no hace nada y lo dice, y no marca a nadie.
 */
function secretosCoinciden(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface Pendiente {
  user_id: string;
  email: string;
  first_name: string | null;
  tiene_avion: boolean;
  tiene_whatsapp: boolean;
}

export async function POST(req: NextRequest) {
  const esperado = process.env.DOCUMENTS_ALERT_SECRET;
  if (!esperado) return NextResponse.json({ error: "Barrido no configurado" }, { status: 503 });
  if (!secretosCoinciden(req.headers.get("X-Cron-Secret") ?? "", esperado)) {
    return NextResponse.json({ error: "Secreto inválido" }, { status: 401 });
  }
  if (!mailConfigurado()) {
    const prueba = await enviarMail({ para: "x@x", asunto: "", texto: "", html: "" });
    return NextResponse.json({ enviados: 0, motivo: prueba.motivo });
  }

  let pendientes: Pendiente[];
  try {
    const res = await fetch(`${API_URL}/onboarding/recordatorios`, { headers: { "X-Cron-Secret": esperado }, cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: `El backend contestó ${res.status}` }, { status: 502 });
    pendientes = await res.json();
  } catch (err) {
    return NextResponse.json({ error: `No se pudo consultar el backend: ${err}` }, { status: 502 });
  }

  const exitosos: string[] = [];
  const problemas: string[] = [];
  for (const p of pendientes) {
    const mensaje = armarMensajePrimerVuelo({
      nombre: p.first_name,
      tieneAvion: p.tiene_avion,
      tieneWhatsapp: p.tiene_whatsapp,
      appUrl: APP_URL,
      linkCopiloto: linkCopiloto(),
    });
    const r = await enviarMail({ para: p.email, ...mensaje });
    if (r.enviado) exitosos.push(p.user_id);
    // Sin el mail en el log: el id alcanza para buscarlo.
    else problemas.push(`${p.user_id}: ${r.motivo ?? "no se pudo enviar"}`);
  }

  let marcados = 0;
  if (exitosos.length) {
    try {
      const res = await fetch(`${API_URL}/onboarding/recordatorios/enviados`, {
        method: "POST",
        headers: { "X-Cron-Secret": esperado, "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: exitosos }),
      });
      if (res.ok) marcados = (await res.json()).marcados ?? 0;
      else problemas.push(`marcar enviados: el backend contestó ${res.status}`);
    } catch (err) {
      problemas.push(`marcar enviados: ${err}`);
    }
  }

  return NextResponse.json({ pendientes: pendientes.length, enviados: exitosos.length, marcados, problemas });
}
