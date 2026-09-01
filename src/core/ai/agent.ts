import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiAgentTools } from "./tools";
import { buildSystemPrompt } from "./prompts";
import { ReservationEngine } from "../reservation/reservationEngine";
import { TenantService } from "../tenant/tenantService";
import { Logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  Logger.warn("⚠️ GEMINI_API_KEY non trovata nel file .env!");
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface ChatMessage {
  role: "user" | "model";
  parts: { text?: string; functionCall?: any; functionResponse?: any }[];
}

export interface ProcessMessageResult {
  replyText: string;
  toolCallsExecuted: { toolName: string; args: any; result: any }[];
  needsHumanHandoff: boolean;
}

export class AIAgentService {
  /**
   * Esegue l'orchestrazione del messaggio utente con Function Calling deterministica
   */
  static async processMessage(params: {
    restaurantId: string;
    customerPhone: string;
    customerName?: string;
    incomingText: string;
    conversationHistory?: ChatMessage[];
  }): Promise<ProcessMessageResult> {
    const { restaurantId, customerPhone, customerName, incomingText, conversationHistory = [] } = params;

    // 1. Recupero del contesto completo del tenant
    const tenant = await TenantService.getTenantFullContext(restaurantId);

    // Calcolo data odierna nel fuso orario del locale
    const nowInTz = new Date().toLocaleDateString("sv-SE", { timeZone: tenant.timezone });

    const systemInstruction = buildSystemPrompt({
      restaurantName: tenant.name,
      phone: tenant.phone,
      address: tenant.address,
      timezone: tenant.timezone,
      currentDate: nowInTz,
      agentName: tenant.agentPersona?.agentName,
      tone: tenant.agentPersona?.tone,
      emojiEnabled: tenant.agentPersona?.emojiEnabled ?? true,
      customRules: tenant.agentPersona?.customRules,
    });

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      systemInstruction,
      tools: [{ functionDeclarations: aiAgentTools }],
    });

    // Filtra la history per contenere al massimo gli ultimi 12 scambi (cost control)
    const recentHistory = conversationHistory.slice(-12);

    const chat = model.startChat({
      history: recentHistory.map((h) => ({
        role: h.role,
        parts: h.parts.map((p) => {
          if (p.text) return { text: p.text };
          if (p.functionCall) return { functionCall: p.functionCall };
          if (p.functionResponse) return { functionResponse: p.functionResponse };
          return { text: "" };
        }),
      })),
    });

    // Retry automatico in caso di 429 (rate limit) o 503
    async function sendWithRetry(msg: any, maxAttempts = 2): Promise<any> {
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          return await chat.sendMessage(msg);
        } catch (err: any) {
          attempts++;
          const isRateLimit = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("Quota exceeded");
          const isBusy = err?.status === 503;

          if ((isRateLimit || isBusy) && attempts < maxAttempts) {
            const delay = 1500;
            Logger.warn(`⚠️ Errore ${err?.status || "temporaneo"} da Gemini. Attesa prima del riprova...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw err;
          }
        }
      }
    }

    let currentResponse: any;
    try {
      currentResponse = await sendWithRetry(incomingText);
    } catch (apiErr: any) {
      Logger.error("Errore chiamata iniziale Gemini:", apiErr);
      return {
        replyText: `Mi dispiace, si è verificato un momento di sovraccarico temporaneo. Se hai urgenza, puoi contattare direttamente il ristorante al ${tenant.phone || "nostro numero"}.`,
        toolCallsExecuted: [],
        needsHumanHandoff: false,
      };
    }

    const toolCallsExecuted: { toolName: string; args: any; result: any }[] = [];
    let needsHumanHandoff = false;
    let loopCount = 0;
    const MAX_TOOL_LOOPS = 5;

    // Loop per gestire eventuali chiamate sequenziali di tool
    while (loopCount < MAX_TOOL_LOOPS) {
      const functionCalls = currentResponse?.response?.functionCalls ? currentResponse.response.functionCalls() : [];
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      loopCount++;
      const call = functionCalls[0];
      Logger.info(`AI Tool Invoked: ${call.name}`, call.args);

      let toolResult: any;

      try {
        switch (call.name) {
          case "getRestaurantInfo":
            toolResult = {
              name: tenant.name,
              phone: tenant.phone,
              address: tenant.address,
              description: tenant.description,
              rules: tenant.bookingRules.map((r) => r.description || r.ruleKey),
            };
            break;

          case "getOpeningHours":
            toolResult = {
              hours: tenant.hours.map((h) => ({
                dayOfWeek: h.dayOfWeek,
                shift: h.shiftName,
                open: h.openTime,
                close: h.closeTime,
                closed: h.isClosed,
              })),
              closures: tenant.closures,
            };
            break;

          case "checkAvailability": {
            const { date, time, guests } = call.args as any;
            toolResult = await ReservationEngine.checkAvailability(
              tenant.id,
              date,
              time,
              Number(guests)
            );
            break;
          }

          case "getAvailableTimes": {
            const { date, guests, targetTime } = call.args as any;
            const slots = await ReservationEngine.getAvailableTimes(
              tenant.id,
              date,
              Number(guests),
              targetTime
            );
            toolResult = { availableTimes: slots };
            break;
          }

          case "createBooking": {
            const { customerName: nameArg, customerPhone: phoneArg, date, time, guests, notes } = call.args as any;
            const resolvedPhone = phoneArg || customerPhone;
            const resolvedName = nameArg || customerName || "Cliente";

            toolResult = await ReservationEngine.createBooking({
              restaurantId: tenant.id,
              customerPhone: resolvedPhone,
              customerName: resolvedName,
              date,
              time,
              guests: Number(guests),
              notes,
            });
            break;
          }

          case "getCustomerBookings": {
            const { customerPhone: phoneArg } = call.args as any;
            const bookings = await ReservationEngine.getCustomerBookings(
              tenant.id,
              phoneArg || customerPhone
            );
            toolResult = { bookings };
            break;
          }

          case "modifyBooking": {
            const { bookingId, newDate, newTime, newGuests, newNotes } = call.args as any;
            toolResult = await ReservationEngine.modifyBooking({
              bookingId,
              newDate,
              newTime,
              newGuests: newGuests ? Number(newGuests) : undefined,
              newNotes,
            });
            break;
          }

          case "cancelBooking": {
            const { bookingId, reason } = call.args as any;
            toolResult = await ReservationEngine.cancelBooking(bookingId, reason);
            break;
          }

          case "handoffToHuman": {
            const { reason } = call.args as any;
            needsHumanHandoff = true;

            try {
              const customer = await prisma.customer.findUnique({
                where: {
                  restaurantId_whatsappPhone: {
                    restaurantId: tenant.id,
                    whatsappPhone: customerPhone,
                  },
                },
              });

              if (customer) {
                const conv = await prisma.conversation.findFirst({
                  where: { restaurantId: tenant.id, customerId: customer.id },
                });

                if (conv) {
                  await prisma.conversation.update({
                    where: { id: conv.id },
                    data: { needsHuman: true },
                  });

                  await prisma.humanHandoff.create({
                    data: {
                      restaurantId: tenant.id,
                      conversationId: conv.id,
                      reason: reason || "Richiesta operatore umano",
                    },
                  });
                }
              }
            } catch (err) {
              Logger.error("Errore durante la registrazione del handoff:", err);
            }

            toolResult = {
              status: "HANDOFF_INITIATED",
              message: "Un membro del personale del ristorante è stato notificato e prenderà in carico la chat.",
            };
            break;
          }

          default:
            toolResult = { error: `Tool sconosciuto: ${call.name}` };
        }
      } catch (toolErr: any) {
        Logger.error(`Errore nell'esecuzione del tool ${call.name}:`, toolErr);
        toolResult = { error: toolErr.message || "Errore durante l'operazione." };
      }

      toolCallsExecuted.push({
        toolName: call.name,
        args: call.args,
        result: toolResult,
      });

      // Rispedisce l'esito della funzione al modello Gemini per generare la risposta naturale
      try {
        currentResponse = await sendWithRetry([
          {
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          },
        ]);
      } catch (toolSendErr) {
        Logger.warn("Chiamata di ritorno tool a Gemini fallita, utilizzo generatore naturale deterministico.");
        break;
      }
    }

    // Traccia l'uso AI
    await TenantService.recordUsage(tenant.id, "ai_tokens", 1);

    // Estrazione testo naturale dalla risposta Gemini
    let replyText = "";
    try {
      if (currentResponse?.response?.text) {
        replyText = currentResponse.response.text();
      }
    } catch {
      replyText = "";
    }

    // Se la risposta è vuota o il modello non ha restituito testo dopo i tool, generiamo la risposta naturale deterministica
    if (!replyText && toolCallsExecuted.length > 0) {
      const lastTool = toolCallsExecuted[toolCallsExecuted.length - 1];
      replyText = AIAgentService.generateNaturalFallback(lastTool.toolName, lastTool.args, lastTool.result, tenant.name);
    }

    if (!replyText) {
      replyText = "Come posso aiutarti con la tua prenotazione?";
    }

    return {
      replyText,
      toolCallsExecuted,
      needsHumanHandoff,
    };
  }

  /**
   * Generatore testuale naturale deterministico di emergenza/fallback
   */
  private static generateNaturalFallback(toolName: string, args: any, result: any, restaurantName: string): string {
    switch (toolName) {
      case "checkAvailability":
        if (result.available) {
          return `Ho verificato con la cucina: c'è disponibilità per ${args.guests} persone il ${result.requestedDate} alle ${result.requestedTime}! Confermi la prenotazione a tuo nome?`;
        }
        if (result.alternatives && result.alternatives.length > 0) {
          return `${result.message} Posso però proporti questi orari alternativi: ${result.alternatives.join(", ")}. Quale preferisci?`;
        }
        return result.message || "Spiacenti, non abbiamo disponibilità per l'orario richiesto.";

      case "getAvailableTimes":
        if (result.availableTimes && result.availableTimes.length > 0) {
          return `Per il ${args.date} per ${args.guests} persone abbiamo disponibilità nei seguenti orari: ${result.availableTimes.join(", ")}. A che ora preferisci venire?`;
        }
        return "Purtroppo non abbiamo orari disponibili per la data selezionata. Ti andrebbe di provare per un altro giorno?";

      case "createBooking":
        if (result.success) {
          return `🎉 Prenotazione confermata con successo! Ti aspettiamo da ${restaurantName} il ${result.date} alle ${result.time} per ${result.guests} persone a nome ${result.customerName}.`;
        }
        return result.message || "Non è stato possibile confermare la prenotazione.";

      case "modifyBooking":
        if (result.success) {
          return `✅ La tua prenotazione è stata aggiornata con successo per il ${result.date} alle ${result.time} per ${result.guests} persone.`;
        }
        return result.message || "Non è stato possibile modificare la prenotazione.";

      case "cancelBooking":
        return "La tua prenotazione è stata cancellata correttamente. Restiamo a disposizione per future prenotazioni!";

      case "getOpeningHours":
        return "I nostri orari sono: Pranzo 12:00 - 14:30 e Cena 19:00 - 23:00 (chiusi il mercoledì).";

      case "handoffToHuman":
        return "Ho notificato un membro dello staff del ristorante che prenderà in carico la chat a breve!";

      default:
        return "Operazione completata con successo. Posso aiutarti con altro?";
    }
  }
}
