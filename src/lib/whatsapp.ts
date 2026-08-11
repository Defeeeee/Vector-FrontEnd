/**
 * Outbound WhatsApp delivery through Kapso.
 *
 * Lives here rather than inside the webhook route because the expiry-alert cron
 * (`/api/cron/document-alerts`) sends messages too, and it has to know whether
 * delivery actually succeeded before marking a document as notified — a
 * fire-and-forget send would silently burn the 60/30/7 day warning.
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  dynamicPhoneId?: string
): Promise<boolean> {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID || dynamicPhoneId;

  if (!apiKey || !phoneNumberId) {
    console.error("Missing Kapso API configuration (KAPSO_API_KEY or KAPSO_PHONE_NUMBER_ID)");
    return false;
  }

  const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Error sending WhatsApp message via Kapso:", errText, "URL:", url);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send WhatsApp message:", err);
    return false;
  }
}

/**
 * Envío por **plantilla aprobada**, que es la única forma de escribirle a un
 * piloto que no habló primero.
 *
 * Meta sólo permite texto libre dentro de las **24 horas** desde el último
 * mensaje del usuario. Un aviso de vencimiento es proactivo por definición:
 * llega justo cuando el piloto no escribió nada. Por eso `sendWhatsAppMessage`
 * —que manda `type: "text"`— sirve para el copiloto, que responde, y **no puede
 * servir para el barrido**, que inicia. Comprobado en producción el 2026-08-11:
 *
 *   "Cannot send non-template messages outside the 24-hour window."
 *
 * El nombre de la plantilla y el idioma van por entorno porque los fija Meta al
 * aprobarlas, no el código: si mañana se aprueba una variante, se cambia la
 * variable y no hace falta desplegar.
 *
 * Kapso expone la Cloud API de Meta tal cual —la URL es `/meta/whatsapp/v24.0/`—
 * así que el cuerpo es el de Meta. Header, footer y botón sin variables no
 * necesitan componente propio: sólo van los parámetros del body, en orden.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[],
  languageCode = process.env.WHATSAPP_TEMPLATE_LANG || "es_AR"
): Promise<boolean> {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;

  if (!apiKey || !phoneNumberId) {
    console.error("Missing Kapso API configuration (KAPSO_API_KEY or KAPSO_PHONE_NUMBER_ID)");
    return false;
  }
  if (!templateName) {
    console.error("No template name configured for this alert — nothing sent.");
    return false;
  }

  const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: bodyParams.length
            ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
            : [],
        },
      }),
    });

    if (!res.ok) {
      // El texto de Kapso dice exactamente qué rechazó Meta —plantilla sin
      // aprobar, idioma que no coincide, cantidad de parámetros— y sin eso el
      // diagnóstico son horas. No incluye el teléfono, que va en el cuerpo.
      console.error(
        "Error sending WhatsApp template via Kapso:",
        await res.text(),
        "| template:", templateName, "| lang:", languageCode, "| params:", bodyParams.length
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send WhatsApp template:", err);
    return false;
  }
}
