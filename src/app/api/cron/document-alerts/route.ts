import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.flightlog.fdiaznem.com.ar";

/**
 * Daily sweep that delivers document expiry warnings over WhatsApp.
 *
 * Runs here rather than in the backend because the Kapso credentials live in
 * this app. The backend decides *what* is due (`/document-alerts/pending`) and
 * records what was delivered (`/document-alerts/{id}/sent`); this route is only
 * the courier.
 *
 * Marking happens strictly after a successful send. A failed delivery leaves
 * the document unmarked so the next run retries it — the alternative would burn
 * the 60-day warning on a Kapso outage and never mention it again.
 *
 * Schedule it once a day, e.g. from the same host that runs the backend:
 *   0 12 * * * curl -fsS -X POST \
 *     "https://vector.fdiaznem.com.ar/api/cron/document-alerts?secret=$DOCUMENTS_ALERT_SECRET"
 */

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface PendingAlert {
  document_id: string;
  user_id: string;
  name: string;
  kind: string;
  expiry_date: string;
  threshold: number;
  days_remaining: number;
  whatsapp_phone?: string | null;
  message: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.DOCUMENTS_ALERT_SECRET;
  if (!secret) {
    console.error("DOCUMENTS_ALERT_SECRET not configured — refusing to run the expiry sweep.");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const provided =
    req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  if (!secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pending: PendingAlert[] = [];
  try {
    const res = await fetch(`${API_URL}/document-alerts/pending?secret=${encodeURIComponent(secret)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Expiry sweep: backend refused the pending query:", res.status, detail);
      return NextResponse.json({ error: "Backend error", status: res.status }, { status: 502 });
    }
    pending = await res.json();
  } catch (err) {
    console.error("Expiry sweep: could not reach the backend:", err);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const alert of pending) {
    if (!alert.whatsapp_phone) {
      // No number on file: nothing to deliver to. Left unmarked so the alert
      // still fires if the pilot adds their WhatsApp later.
      skipped += 1;
      continue;
    }

    const delivered = await sendWhatsAppMessage(alert.whatsapp_phone, alert.message);
    if (!delivered) {
      failed += 1;
      continue;
    }

    try {
      const markRes = await fetch(
        `${API_URL}/document-alerts/${alert.document_id}/sent?secret=${encodeURIComponent(secret)}&threshold=${alert.threshold}`,
        { method: "POST", cache: "no-store" }
      );
      if (!markRes.ok) {
        // Delivered but not recorded: the pilot may get one duplicate tomorrow,
        // which is the right way round to fail.
        console.error("Expiry sweep: delivered but could not mark", alert.document_id, markRes.status);
      }
      sent += 1;
    } catch (err) {
      console.error("Expiry sweep: delivered but could not mark", alert.document_id, err);
      sent += 1;
    }
  }

  return NextResponse.json({ pending: pending.length, sent, skipped, failed });
}
