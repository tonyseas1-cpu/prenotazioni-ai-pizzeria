import { NextRequest, NextResponse } from "next/server";
import { WhatsAppService } from "@/core/whatsapp/whatsappService";
import { Logger } from "@/lib/logger";

/**
 * Endpoint per la Demo Interattiva Web (simula un messaggio WhatsApp in ingresso)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, customerPhone = "+393401234567", customerName = "Cliente Demo", phoneNumberId = "mock_phone_id" } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Il campo 'message' è obbligatorio." }, { status: 400 });
    }

    const result = await WhatsAppService.handleInboundMessage({
      from: customerPhone,
      name: customerName,
      messageId: `demo_msg_${Date.now()}`,
      text: message.trim(),
      timestamp: Date.now(),
      phoneNumberId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    Logger.error("Errore API Chat Demo:", error);
    return NextResponse.json(
      { error: error.message || "Si è verificato un errore durante l'elaborazione." },
      { status: 500 }
    );
  }
}
