import { NextRequest, NextResponse } from "next/server";
import { WhatsAppService } from "@/core/whatsapp/whatsappService";
import { Logger } from "@/lib/logger";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "pizzeria_chieri_segreto_123";

/**
 * Endpoint di verifica Webhook per Meta WhatsApp Cloud API
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    Logger.info("Webhook Meta WhatsApp verificato con successo!");
    return new NextResponse(challenge, { status: 200 });
  }

  Logger.warn("Tentativo di verifica Webhook non autorizzato o token errato.");
  return new NextResponse("Token non valido", { status: 403 });
}

/**
 * Ricezione e gestione asincrona dei messaggi WhatsApp da Meta
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validazione payload Meta Cloud API
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === "text") {
      const phoneNumberId = value.metadata?.phone_number_id || "mock_phone_id";
      const from = message.from;
      const text = message.text?.body;
      const name = value.contacts?.[0]?.profile?.name;

      // Elaborazione completa tramite il servizio multi-tenant
      await WhatsAppService.handleInboundMessage({
        from,
        name,
        messageId: message.id,
        text,
        timestamp: Number(message.timestamp) || Date.now(),
        phoneNumberId,
      });
    }

    // Risposta 200 OK rapida a Meta per evitare retry
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error: any) {
    Logger.error("Errore nell'elaborazione del Webhook WhatsApp:", error);
    return NextResponse.json({ error: error.message || "Errore interno" }, { status: 500 });
  }
}
