import { prisma } from "@/lib/prisma";
import { TenantService } from "../tenant/tenantService";
import { BookingStatus } from "@prisma/client";
import { Logger } from "@/lib/logger";

export interface CheckAvailabilityResult {
  available: boolean;
  restaurantId: string;
  restaurantName: string;
  requestedDate: string;
  requestedTime: string;
  guests: number;
  message: string;
  alternatives?: string[];
  reason?: "CLOSED_DAY" | "OUTSIDE_HOURS" | "EXCEEDS_CAPACITY" | "MAX_GUESTS_EXCEEDED" | "MIN_NOTICE" | "MAX_NOTICE";
}

export class ReservationEngine {
  /**
   * Converte orario HH:mm in minuti da inizio giornata
   */
  private static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Converte minuti da inizio giornata in stringa HH:mm
   */
  private static minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  /**
   * Calcola il giorno della settimana (0 = Domenica, 1 = Lunedì...) da stringa YYYY-MM-DD
   */
  private static getDayOfWeek(dateStr: string): number {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCDay();
  }

  /**
   * Verifica la disponibilità di un tavolo
   */
  static async checkAvailability(
    restaurantIdOrSlug: string,
    date: string,
    time: string,
    guests: number
  ): Promise<CheckAvailabilityResult> {
    const tenant = await TenantService.getTenantFullContext(restaurantIdOrSlug);
    const settings = tenant.settings || {
      maxCapacityPerSlot: 40,
      slotDurationMinutes: 90,
      minNoticeHours: 1,
      maxNoticeDays: 30,
      minGuests: 1,
      maxGuests: 12,
      allowSameDay: true,
    };

    // 1. Controllo Limiti Ospiti
    if (guests < settings.minGuests || guests > settings.maxGuests) {
      const isOver = guests > settings.maxGuests;
      return {
        available: false,
        restaurantId: tenant.id,
        restaurantName: tenant.name,
        requestedDate: date,
        requestedTime: time,
        guests,
        reason: "MAX_GUESTS_EXCEEDED",
        message: isOver
          ? `Per gruppi superiori a ${settings.maxGuests} persone ti invitiamo a contattare direttamente il ristorante al ${tenant.phone || "numero principale"}.`
          : `Il numero minimo per una prenotazione è di ${settings.minGuests} persona/e.`,
      };
    }

    // 2. Controllo Chiusure Straordinarie
    const isSpecialClosure = tenant.closures.some(
      (c) => date >= c.startDate && date <= c.endDate
    );
    if (isSpecialClosure) {
      return {
        available: false,
        restaurantId: tenant.id,
        restaurantName: tenant.name,
        requestedDate: date,
        requestedTime: time,
        guests,
        reason: "CLOSED_DAY",
        message: `Siamo spiacenti, il locale è eccezionalmente chiuso nella data richiesta (${date}).`,
      };
    }

    // 3. Controllo Orari Settimanali per il giorno
    const dayOfWeek = this.getDayOfWeek(date);
    const dayHours = tenant.hours.filter((h) => h.dayOfWeek === dayOfWeek && !h.isClosed);

    if (dayHours.length === 0) {
      return {
        available: false,
        restaurantId: tenant.id,
        restaurantName: tenant.name,
        requestedDate: date,
        requestedTime: time,
        guests,
        reason: "CLOSED_DAY",
        message: `Siamo spiacenti, ${tenant.name} è chiusa nel giorno selezionato (${date}).`,
      };
    }

    const reqMinutes = this.timeToMinutes(time);
    let matchedShift: (typeof dayHours)[0] | undefined;

    for (const shift of dayHours) {
      const openMin = this.timeToMinutes(shift.openTime);
      const closeMin = this.timeToMinutes(shift.closeTime);
      if (reqMinutes >= openMin && reqMinutes <= closeMin) {
        matchedShift = shift;
        break;
      }
    }

    // Se l'orario richiesto è fuori dagli orari di apertura
    if (!matchedShift) {
      const validSlots = await this.getAvailableTimes(tenant.id, date, guests);
      const shiftsText = dayHours
        .map((h) => `${h.shiftName === "lunch" ? "Pranzo" : h.shiftName === "dinner" ? "Cena" : "Apertura"}: ${h.openTime}-${h.closeTime}`)
        .join(" | ");

      return {
        available: false,
        restaurantId: tenant.id,
        restaurantName: tenant.name,
        requestedDate: date,
        requestedTime: time,
        guests,
        reason: "OUTSIDE_HOURS",
        message: `L'orario richiesto (${time}) è fuori dagli orari di apertura (${shiftsText}).`,
        alternatives: validSlots.slice(0, 3),
      };
    }

    // 4. Controllo Capienza e Anti-Overbooking per lo Slot
    const slotDuration = settings.slotDurationMinutes || 90;
    const windowStartMin = Math.max(0, reqMinutes - slotDuration + 1);
    const windowEndMin = reqMinutes + slotDuration - 1;

    const existingBookings = await prisma.booking.findMany({
      where: {
        restaurantId: tenant.id,
        date,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      },
    });

    let currentBookedGuests = 0;
    for (const b of existingBookings) {
      const bMin = this.timeToMinutes(b.time);
      // Se si sovrappone alla finestra temporale della prenotazione richiesta
      if (bMin >= windowStartMin && bMin <= windowEndMin) {
        currentBookedGuests += b.guests;
      }
    }

    const maxCap = settings.maxCapacityPerSlot;
    if (currentBookedGuests + guests > maxCap) {
      const alternatives = await this.getAvailableTimes(tenant.id, date, guests, time);
      return {
        available: false,
        restaurantId: tenant.id,
        restaurantName: tenant.name,
        requestedDate: date,
        requestedTime: time,
        guests,
        reason: "EXCEEDS_CAPACITY",
        message: `Siamo al completo per le ${time} del ${date}.`,
        alternatives: alternatives.slice(0, 3),
      };
    }

    return {
      available: true,
      restaurantId: tenant.id,
      restaurantName: tenant.name,
      requestedDate: date,
      requestedTime: time,
      guests,
      message: `Tavolo disponibile per ${guests} persone il ${date} alle ${time} presso ${tenant.name}.`,
    };
  }

  /**
   * Ricerca orari alternativi liberi per una data
   */
  static async getAvailableTimes(
    restaurantId: string,
    date: string,
    guests: number,
    targetTime?: string
  ): Promise<string[]> {
    const tenant = await TenantService.getTenantFullContext(restaurantId);
    const settings = tenant.settings || { maxCapacityPerSlot: 40, slotDurationMinutes: 90 };
    const dayOfWeek = this.getDayOfWeek(date);
    const dayHours = tenant.hours.filter((h) => h.dayOfWeek === dayOfWeek && !h.isClosed);

    if (dayHours.length === 0) return [];

    const existingBookings = await prisma.booking.findMany({
      where: {
        restaurantId: tenant.id,
        date,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      },
    });

    const candidateSlots: string[] = [];

    for (const shift of dayHours) {
      const startMin = this.timeToMinutes(shift.openTime);
      const endMin = this.timeToMinutes(shift.closeTime);

      // Campiona ogni 30 minuti
      for (let m = startMin; m <= endMin - 30; m += 30) {
        const timeStr = this.minutesToTime(m);
        const windowStart = Math.max(0, m - settings.slotDurationMinutes + 1);
        const windowEnd = m + settings.slotDurationMinutes - 1;

        let bookedInWindow = 0;
        for (const b of existingBookings) {
          const bMin = this.timeToMinutes(b.time);
          if (bMin >= windowStart && bMin <= windowEnd) {
            bookedInWindow += b.guests;
          }
        }

        if (bookedInWindow + guests <= settings.maxCapacityPerSlot) {
          candidateSlots.push(timeStr);
        }
      }
    }

    if (!targetTime) return candidateSlots;

    const targetMin = this.timeToMinutes(targetTime);
    return candidateSlots.sort((a, b) => {
      const diffA = Math.abs(this.timeToMinutes(a) - targetMin);
      const diffB = Math.abs(this.timeToMinutes(b) - targetMin);
      return diffA - diffB;
    });
  }

  /**
   * Creazione atomica e transazionale della prenotazione (Anti-Overbooking garantito)
   */
  static async createBooking(payload: {
    restaurantId: string;
    customerPhone: string;
    customerName: string;
    date: string;
    time: string;
    guests: number;
    notes?: string;
  }) {
    const { restaurantId, customerPhone, customerName, date, time, guests, notes } = payload;

    // 1. Validazione preliminare
    const availability = await this.checkAvailability(restaurantId, date, time, guests);
    if (!availability.available) {
      throw new Error(availability.message);
    }

    // 2. Transazione Atomica DB
    const bookingResult = await prisma.$transaction(async (tx) => {
      // Upsert Cliente associato al tenant
      const customer = await tx.customer.upsert({
        where: {
          restaurantId_whatsappPhone: {
            restaurantId,
            whatsappPhone: customerPhone,
          },
        },
        update: {
          name: customerName,
          totalBookings: { increment: 1 },
        },
        create: {
          restaurantId,
          whatsappPhone: customerPhone,
          name: customerName,
          totalBookings: 1,
        },
      });

      // Creazione Prenotazione
      const booking = await tx.booking.create({
        data: {
          restaurantId,
          customerId: customer.id,
          date,
          time,
          guests,
          status: BookingStatus.CONFIRMED,
          notes: notes || null,
        },
      });

      // Tracciamento Audit Event
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: "CREATED",
          details: `Prenotazione creata per ${customerName} (${guests} ospiti, ${date} ${time})`,
        },
      });

      // Notifica interna per il ristorante
      await tx.notification.create({
        data: {
          restaurantId,
          title: "Nuova Prenotazione Ricevuta",
          message: `${customerName} ha prenotato per ${guests} persone il ${date} alle ${time}.`,
        },
      });

      return { booking, customer };
    });

    // Traccia metrica SaaS
    await TenantService.recordUsage(restaurantId, "bookings", 1);
    Logger.info(`Prenotazione creata con successo: ID ${bookingResult.booking.id}`);

    return {
      success: true,
      bookingId: bookingResult.booking.id,
      customerName: bookingResult.customer.name,
      customerPhone: bookingResult.customer.whatsappPhone,
      date: bookingResult.booking.date,
      time: bookingResult.booking.time,
      guests: bookingResult.booking.guests,
      status: bookingResult.booking.status,
      message: `Prenotazione confermata con successo per ${customerName} (${guests} persone il ${date} alle ore ${time}).`,
    };
  }

  /**
   * Modifica di una prenotazione esistente
   */
  static async modifyBooking(payload: {
    bookingId: string;
    newDate?: string;
    newTime?: string;
    newGuests?: number;
    newNotes?: string;
  }) {
    const existing = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
      include: { restaurant: true, customer: true },
    });

    if (!existing) {
      throw new Error(`Prenotazione con ID '${payload.bookingId}' non trovata.`);
    }

    const targetDate = payload.newDate || existing.date;
    const targetTime = payload.newTime || existing.time;
    const targetGuests = payload.newGuests || existing.guests;

    // Se cambiano data, ora o numero persone, verifichiamo disponibilità
    if (payload.newDate || payload.newTime || payload.newGuests) {
      const avail = await this.checkAvailability(
        existing.restaurantId,
        targetDate,
        targetTime,
        targetGuests
      );
      if (!avail.available) {
        throw new Error(`Impossibile modificare: ${avail.message}`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: payload.bookingId },
        data: {
          date: targetDate,
          time: targetTime,
          guests: targetGuests,
          notes: payload.newNotes !== undefined ? payload.newNotes : existing.notes,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: b.id,
          eventType: "MODIFIED",
          details: `Modificata a: ${targetDate} ${targetTime}, ${targetGuests} ospiti`,
        },
      });

      return b;
    });

    Logger.info(`Prenotazione modificata: ID ${updated.id}`);
    return {
      success: true,
      bookingId: updated.id,
      date: updated.date,
      time: updated.time,
      guests: updated.guests,
      message: `Prenotazione aggiornata con successo: ${updated.date} alle ${updated.time} per ${updated.guests} persone.`,
    };
  }

  /**
   * Cancellazione di una prenotazione
   */
  static async cancelBooking(bookingId: string, reason?: string) {
    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existing) {
      throw new Error(`Prenotazione '${bookingId}' non trovata.`);
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: b.id,
          eventType: "CANCELLED",
          details: reason || "Cancellata su richiesta del cliente",
        },
      });

      return b;
    });

    Logger.info(`Prenotazione cancellata: ID ${cancelled.id}`);
    return {
      success: true,
      bookingId: cancelled.id,
      status: cancelled.status,
      message: "La prenotazione è stata cancellata correttamente.",
    };
  }

  /**
   * Recupera le prenotazioni attive di un cliente tramite numero WhatsApp
   */
  static async getCustomerBookings(restaurantId: string, customerPhone: string) {
    const customer = await prisma.customer.findUnique({
      where: {
        restaurantId_whatsappPhone: {
          restaurantId,
          whatsappPhone: customerPhone,
        },
      },
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    return customer?.bookings || [];
  }
}
