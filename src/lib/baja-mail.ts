/**
 * El link para dejar de recibir el resumen del mes, firmado.
 *
 * El mail lleva `?u=<id de la cuenta>&t=<firma>`, y la firma es un HMAC del id con el
 * secreto de los barridos. Así la baja funciona **sin iniciar sesión** —que es lo que
 * se espera de un "no recibirlo más"— y nadie puede dar de baja a otro cambiando el id
 * del link. La etiqueta adelante separa esta firma de cualquier otro uso del secreto.
 *
 * No vence a propósito: un link de baja de un mail de hace un año tiene que andar.
 */
import { createHmac, timingSafeEqual } from "crypto";

const ETIQUETA = "vector:resumen-mensual:baja:";

export function firmaBaja(userId: string, secreto: string): string {
  return createHmac("sha256", secreto).update(ETIQUETA + userId).digest("base64url");
}

export function firmaValida(userId: string, firma: string, secreto: string): boolean {
  if (!userId || !firma || !secreto) return false;
  const a = Buffer.from(firmaBaja(userId, secreto));
  const b = Buffer.from(firma);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** La página de la baja (GET, sólo muestra un botón) y su acción (POST). */
export function linksDeBaja(appUrl: string, userId: string, secreto: string) {
  const q = new URLSearchParams({ u: userId, t: firmaBaja(userId, secreto) }).toString();
  return { pagina: `${appUrl}/mail/baja?${q}`, unClick: `${appUrl}/api/mail/baja?${q}` };
}
