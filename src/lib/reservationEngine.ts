import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ReservationEngine {
  /**
   * Assicura la presenza della tabella e del tenant nel DB (con fallback SQL)
   */
  static async ensureTenantExists(tenantId: string) {
    try {
      const tenantModel = (prisma as any).tenant || (prisma as any).Tenant;
      if (tenantModel) {
        const tenant = await tenantModel.findUnique({ where: { id: tenantId } });
        if (tenant) return tenant;

        return await tenantModel.create({
          data: {
            id: tenantId,
            name: "Pizzeria La Bella Chieri",
            slug: "pizzeria-la-bella-chieri",
            phone: "+393331234567",
            maxCapacity: 40,
          },
        });
      }
    } catch (err) {
      // Procedi con il fallback SQL diretto
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "maxCapacity" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Tenant" ("id", "name", "slug", "phone", "maxCapacity", "createdAt", "updatedAt")
      VALUES ('${tenantId}', 'Pizzeria La Bella Chieri', 'pizzeria-la-bella-chieri', '+393331234567', 40, NOW(), NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);

    return { id: tenantId, name: "Pizzeria La Bella Chieri", maxCapacity: 40 };
  }

  /**
   * Verifica Disponibilità Tavolo con controllo Capienza, Posti ed Orari di Apertura
   */
  static async checkAvailability(
    tenantId: string,
    date: string,
    time: string,
    guests: number
  ) {
    const tenant = await this.ensureTenantExists(tenantId);
    const maxCapacity = tenant.maxCapacity || 40;

    // 1. Controllo Orari di Apertura (Pranzo: 12:00-15:00, Cena: 19:00-23:30)
    const [hours, minutes] = time.split(":").map(Number);
    const timeInMinutes = hours * 60 + (minutes || 0);

    const isLunch = timeInMinutes >= 720 && timeInMinutes <= 900;    // 12:00 - 15:00
    const isDinner = timeInMinutes >= 1140 && timeInMinutes <= 1410; // 19:00 - 23:30

    if (!isLunch && !isDinner) {
      return {
        available: false,
        requestedDate: date,
        requestedTime: time,
        guests,
        restaurantName: tenant.name,
        message: `Spiacenti, ${tenant.name} è chiusa all'orario richiesto (${time}). Siamo aperti a Pranzo (12:00-15:00) e a Cena (19:00-23:30).`,
      };
    }

    // 2. Controllo Capienza Massima Singola Richiesta
    if (guests > maxCapacity) {
      return {
        available: false,
        requestedDate: date,
        requestedTime: time,
        guests,
        restaurantName: tenant.name,
        message: `Spiacenti, la richiesta di ${guests} persone supera la capienza massima totale del locale (${maxCapacity} coperti).`,
      };
    }

    // 3. Calcolo coperti già prenotati a DB per quella data ed orario
    let bookedGuests = 0;
    try {
      const result = await prisma.$queryRawUnsafe<any[]>(
        `SELECT SUM(guests) as total FROM "Booking" WHERE "date" = '${date}' AND "time" = '${time}'`
      );
      if (result && result[0] && result[0].total) {
        bookedGuests = Number(result[0].total);
      }
    } catch (e) {
      // Tabella Booking non ancora popolata o vuota
    }

    const availableSeats = maxCapacity - bookedGuests;

    if (guests > availableSeats) {
      return {
        available: false,
        requestedDate: date,
        requestedTime: time,
        guests,
        restaurantName: tenant.name,
        message: `Posti insufficienti per l'orario richiesto. Posti rimasti: ${availableSeats}.`,
      };
    }

    return {
      available: true,
      requestedDate: date,
      requestedTime: time,
      guests,
      restaurantName: tenant.name,
      message: `Tavolo disponibile per ${guests} persone il ${date} alle ${time} presso ${tenant.name}.`,
    };
  }

  /**
   * Creazione Prenotazione a DB
   */
  static async createBooking(payload: {
    tenantId?: string;
    customerName?: string;
    name?: string;
    phone?: string;
    customerPhone?: string;
    date: string;
    time: string;
    guests: number;
    notes?: string;
  }) {
    const tenantId = payload.tenantId || "tenant_demo";
    await this.ensureTenantExists(tenantId);

    const customerName = payload.customerName || payload.name || "Cliente";
    const phone = payload.phone || payload.customerPhone || "+393331234567";

    try {
      const bookingModel =
        (prisma as any).booking ||
        (prisma as any).Booking ||
        (prisma as any).reservation;

      if (bookingModel) {
        return await bookingModel.create({
          data: {
            tenantId,
            customerName,
            phone,
            date: payload.date,
            time: payload.time,
            guests: Number(payload.guests),
            notes: payload.notes || "",
          },
        });
      }
    } catch (e) {
      // Fallback SQL Diretto
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Booking" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId" TEXT NOT NULL,
        "customerName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "time" TEXT NOT NULL,
        "guests" INTEGER NOT NULL,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Booking" ("id", "tenantId", "customerName", "phone", "date", "time", "guests", "notes")
      VALUES (gen_random_uuid()::text, '${tenantId}', '${customerName}', '${phone}', '${payload.date}', '${payload.time}', ${Number(payload.guests)}, '${payload.notes || ""}');
    `);

    return {
      status: "CONFIRMED",
      customerName,
      date: payload.date,
      time: payload.time,
      guests: payload.guests,
      message: "Prenotazione creata e salvata con successo nel DB!",
    };
  }
}