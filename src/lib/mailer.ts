/**
 * Envío de correo, por Resend.
 *
 * ## Por qué existe y por qué es tan chico
 *
 * El repo no tenía nada de mail: el único cron que había —el de vencimientos— entrega por
 * WhatsApp. Esto es lo mínimo para que el briefing del vuelo de mañana llegue solo.
 *
 * ## **No configurado no es un error**
 *
 * Sin `RESEND_API_KEY` esto no manda y **no rompe nada**: devuelve `enviado: false` con el
 * motivo, y el cron lo registra y sigue. Es deliberado. La alternativa —tirar una
 * excepción— haría que una feature que todavía no se activó ensucie los logs y, peor, que
 * el barrido se caiga antes de procesar al resto.
 *
 * Para activarlo alcanza con la variable de entorno. **No hace falta verificar un dominio**
 * para empezar: el remitente de prueba de Resend entrega al mail del titular de la cuenta,
 * que es exactamente este caso —el piloto se lo manda a sí mismo—. Un dominio propio
 * mejora la entregabilidad cuando haya más de un usuario, y son tres registros DNS.
 */

/** De dónde sale el mail. El de prueba de Resend sirve sin verificar dominio. */
const REMITENTE_POR_DEFECTO = "Vector <onboarding@resend.dev>";

export interface ResultadoEnvio {
  enviado: boolean;
  /** Por qué no se mandó. Vacío cuando salió bien. */
  motivo?: string;
  /** El id que devuelve el proveedor, para poder rastrearlo. */
  id?: string;
}

export interface Mail {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

export async function enviarMail(mail: Mail): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    /*
      Se avisa una vez y con la instrucción adentro, no con un "misconfigured" pelado: el
      que lee este log seis meses después no tiene por qué acordarse de qué variable era.
    */
    return {
      enviado: false,
      motivo: "Falta RESEND_API_KEY: el briefing por mail está apagado. Se activa con esa variable, sin tocar DNS.",
    };
  }

  if (!mail.para.includes("@")) {
    return { enviado: false, motivo: `Destinatario inválido: ${mail.para}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || REMITENTE_POR_DEFECTO,
        to: [mail.para],
        subject: mail.asunto,
        text: mail.texto,
        html: mail.html,
      }),
    });

    if (!res.ok) {
      return { enviado: false, motivo: `Resend contestó ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    const datos = await res.json().catch(() => ({}));
    return { enviado: true, id: datos?.id };
  } catch (err) {
    return { enviado: false, motivo: `No se pudo llamar a Resend: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Si el envío de correo está activado. Lo usa el cron para no barrer al pedo. */
export function mailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
