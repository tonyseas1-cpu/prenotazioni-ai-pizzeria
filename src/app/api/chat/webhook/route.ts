import { NextRequest, NextResponse } from "next/server";

// Questo token servirà a Meta per verificare che il server sia tuo
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "pizzeria_chieri_segreto_123";

// Gestione GET: Richiesta di verifica da parte di Meta
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificato con successo da Meta!");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Token non valido", { status: 403 });
}

// Gestione POST: Ricezione dei messaggi in arrivo da WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Stampa il messaggio in console (visibile nei log di Vercel)
    console.log("Messaggio WhatsApp ricevuto:", JSON.stringify(body, null, 2));
    
    // Meta richiede sempre una risposta 200 OK rapida
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Errore nel webhook:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}