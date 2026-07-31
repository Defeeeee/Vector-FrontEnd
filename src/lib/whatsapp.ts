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
