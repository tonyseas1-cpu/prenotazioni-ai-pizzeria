import { NextRequest, NextResponse } from "next/server";
import { processUserMessage } from "@/lib/aiAgent";
import { ReservationEngine } from "@/lib/reservationEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Il campo 'message' è obbligatorio." },
        { status: 400 }
      );
    }

    // Context del ristorante (data dinamica odierna)
    const context = {
      name: "Pizzeria La Bella Chieri",
      timezone: "Europe/Rome",
      currentDate: new Date().toISOString().split("T")[0],
    };

    // 1. Invio del messaggio all'agente IA
    const agentResponse = await processUserMessage(message, history, context);

    // 2. Gestione eventuale Tool Call
    if (agentResponse.type === "TOOL_CALL") {
      let toolResult: any;

      if (agentResponse.name === "checkAvailability") {
        const args = agentResponse.args as any;
        toolResult = await ReservationEngine.checkAvailability(
          "tenant_demo",
          args.date,
          args.time,
          Number(args.guests)
        );
      } else if (agentResponse.name === "createBooking") {
        toolResult = await ReservationEngine.createBooking({
          tenantId: "tenant_demo",
          ...(agentResponse.args as any),
        });
      }

      return NextResponse.json({
        type: "TOOL_CALL",
        toolName: agentResponse.name,
        args: agentResponse.args,
        result: toolResult,
      });
    }

    // 3. Risposta testuale semplice
    return NextResponse.json({
      type: "TEXT",
      text: agentResponse.text,
    });
  } catch (error: any) {
    console.error("⚠️ Errore API Chat:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server." },
      { status: 500 }
    );
  }
}