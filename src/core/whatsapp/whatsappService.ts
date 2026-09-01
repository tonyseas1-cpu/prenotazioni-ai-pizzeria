import { prisma } from "@/lib/prisma";
import { Logger } from "@/lib/logger";
import { AIAgentService } from "../ai/agent";
import { TenantService } from "../tenant/tenantService";
import { InboundWhatsAppMessage, OutboundWhatsAppMessage, IWhatsAppProvider } from "./types";
import { MessageSender } from "@prisma/client";

/**
 * Provider Reale: Meta WhatsApp Cloud API
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  async sendMessage(msg: OutboundWhatsAppMessage) {
    try {
      const phoneNumberId = msg.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = msg.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken) {
        throw new Error("WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN mancanti.");
      }

      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: msg.to,
          type: "text",
          text: { body: msg.text },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        Logger.error("Errore risposta Meta Cloud API:", data);
        return { success: false, error: JSON.stringify(data) };
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      Logger.error("Eccezione durante invio Meta WhatsApp:", err);
      return { success: false, error: err.message };
    }
  }
}

/**
 * Provider Mock: Ideale per sviluppo locale, demo e test automatici
 */
export class MockWhatsAppProvider implements IWhatsAppProvider {
  async sendMessage(msg: OutboundWhatsAppMessage) {
    Logger.info(`[MOCK WHATSAPP OUTBOUND] A: ${msg.to} | Messaggio: "${msg.text}"`);
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}`,
    };
  }
}

/**
 * Servizio Gestione Flusso Completo WhatsApp Multi-Tenant
 */
export class WhatsAppService {
  private static getProvider(providerType: string = "mock"): IWhatsAppProvider {
    if (providerType === "meta") {
      return new MetaWhatsAppProvider();
    }
    return new MockWhatsAppProvider();
  }

  /**
   * Gestione del messaggio in ingresso da Webhook Meta o Simulatore Demo
   */
  static async handleInboundMessage(inbound: InboundWhatsAppMessage) {
    Logger.info(`Ricevuto messaggio WhatsApp da ${inbound.from}: "${inbound.text}"`);

    // 1. Identificazione del Ristorante
    let restaurant = await TenantService.getTenantByWhatsAppPhoneId(inbound.phoneNumberId);
    if (!restaurant) {
      // Fallback sul ristorante pilota se in modalità mock/demo
      restaurant = await TenantService.getTenantFullContext("pizzeria-la-bella-chieri");
    }

    if (!restaurant) {
      throw new Error(`Ristorante non trovato per il phone ID ${inbound.phoneNumberId}`);
    }

    // 2. Identificazione o Creazione Cliente
    const customer = await prisma.customer.upsert({
      where: {
        restaurantId_whatsappPhone: {
          restaurantId: restaurant.id,
          whatsappPhone: inbound.from,
        },
      },
      update: {
        name: inbound.name || undefined,
      },
      create: {
        restaurantId: restaurant.id,
        whatsappPhone: inbound.from,
        name: inbound.name || "Cliente WhatsApp",
      },
    });

    // 3. Recupero o Creazione Conversazione
    let conversation = await prisma.conversation.findFirst({
      where: {
        restaurantId: restaurant.id,
        customerId: customer.id,
      },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
          take: 12,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          restaurantId: restaurant.id,
          customerId: customer.id,
          currentState: "GREETING",
        },
        include: {
          messages: true,
        },
      });
    }

    // 4. Salvataggio Messaggio Cliente a DB
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.CUSTOMER,
        content: inbound.text,
      },
    });

    // 5. Controllo se la chat richiede operatore umano
    if (conversation.needsHuman) {
      Logger.info(`Conversazione ${conversation.id} in gestione manuale: l'IA non risponde.`);
      return {
        handledBy: "HUMAN_REQUIRED",
        replyText: null,
      };
    }

    // 6. Preparazione dello storico conversazione per l'AI
    const conversationHistory: any[] = conversation.messages.map((m) => ({
      role: m.sender === MessageSender.CUSTOMER ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // 7. Elaborazione Agente IA
    const aiResult = await AIAgentService.processMessage({
      restaurantId: restaurant.id,
      customerPhone: inbound.from,
      customerName: customer.name || undefined,
      incomingText: inbound.text,
      conversationHistory,
    });

    // 8. Salvataggio Risposta Agente nel DB
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.AGENT,
        content: aiResult.replyText,
        rawMetadata: { toolCalls: aiResult.toolCallsExecuted } as any,
      },
    });

    // 9. Invio tramite il Provider WhatsApp configurato
    const provider = this.getProvider(restaurant.whatsappAccount?.provider || "mock");
    await provider.sendMessage({
      to: inbound.from,
      text: aiResult.replyText,
      phoneNumberId: restaurant.whatsappAccount?.phoneNumberId || undefined,
      accessToken: restaurant.whatsappAccount?.accessToken || undefined,
    });

    // 10. Tracciamento metrica messaggi SaaS
    await TenantService.recordUsage(restaurant.id, "messages", 2); // 1 inbound + 1 outbound

    return {
      handledBy: "AI_AGENT",
      replyText: aiResult.replyText,
      toolCalls: aiResult.toolCallsExecuted,
      needsHuman: aiResult.needsHumanHandoff,
    };
  }
}
