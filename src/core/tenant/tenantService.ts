import { prisma } from "@/lib/prisma";
import { Logger } from "@/lib/logger";

export class TenantService {
  /**
   * Recupera il contesto completo del ristorante (impostazioni, orari, persona IA, regole)
   */
  static async getTenantFullContext(restaurantIdOrSlug: string) {
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [{ id: restaurantIdOrSlug }, { slug: restaurantIdOrSlug }],
        isActive: true,
      },
      include: {
        settings: true,
        hours: true,
        closures: true,
        bookingRules: true,
        agentPersona: true,
        whatsappAccount: true,
      },
    });

    if (!restaurant) {
      Logger.warn(`Tenant non trovato: ${restaurantIdOrSlug}`);
      throw new Error(`Ristorante '${restaurantIdOrSlug}' non trovato o non attivo.`);
    }

    return restaurant;
  }

  /**
   * Recupera il ristorante associato a un account WhatsApp (Meta Phone Number ID)
   */
  static async getTenantByWhatsAppPhoneId(phoneNumberId: string) {
    const account = await prisma.whatsAppAccount.findUnique({
      where: { phoneNumberId },
      include: {
        restaurant: {
          include: {
            settings: true,
            hours: true,
            closures: true,
            bookingRules: true,
            agentPersona: true,
            whatsappAccount: true,
          },
        },
      },
    });

    if (!account || !account.restaurant || !account.restaurant.isActive) {
      Logger.warn(`Nessun ristorante attivo associato al WhatsApp Phone ID: ${phoneNumberId}`);
      return null;
    }

    return account.restaurant;
  }

  /**
   * Traccia l'utilizzo metriche (es: messaggi, prenotazioni, chiamate AI)
   */
  static async recordUsage(restaurantId: string, metric: "messages" | "bookings" | "ai_tokens", quantity: number = 1) {
    try {
      await prisma.usageRecord.create({
        data: {
          restaurantId,
          metric,
          quantity,
        },
      });
    } catch (err) {
      Logger.error(`Errore nel tracciamento dell'uso per metric ${metric}:`, err);
    }
  }
}
