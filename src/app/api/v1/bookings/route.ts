import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReservationEngine } from "@/core/reservation/reservationEngine";
import { BookingStatus } from "@prisma/client";
import { Logger } from "@/lib/logger";

/**
 * GET: Lista prenotazioni per ristorante con filtri opzionali (data, status)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const slug = searchParams.get("slug") || "pizzeria-la-bella-chieri";
    const date = searchParams.get("date");
    const status = searchParams.get("status") as BookingStatus | null;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Ristorante non trovato" }, { status: 404 });
    }

    const whereClause: any = {
      restaurantId: restaurant.id,
    };

    if (date) whereClause.date = date;
    if (status) whereClause.status = status;

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: { customer: true, events: true },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    Logger.error("Errore recupero prenotazioni:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Creazione manuale di una prenotazione dalla dashboard
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantSlug = "pizzeria-la-bella-chieri", customerName, customerPhone, date, time, guests, notes } = body;

    const restaurant = await prisma.restaurant.findUnique({ where: { slug: restaurantSlug } });
    if (!restaurant) {
      return NextResponse.json({ error: "Ristorante non trovato" }, { status: 404 });
    }

    const result = await ReservationEngine.createBooking({
      restaurantId: restaurant.id,
      customerName,
      customerPhone,
      date,
      time,
      guests: Number(guests),
      notes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    Logger.error("Errore creazione manuale prenotazione:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

/**
 * PATCH: Aggiorna stato o dettagli prenotazione
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, status, newDate, newTime, newGuests, newNotes } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId obbligatorio" }, { status: 400 });
    }

    if (status) {
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: status as BookingStatus },
      });
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          eventType: "STATUS_CHANGED",
          details: `Stato cambiato in ${status}`,
        },
      });
      return NextResponse.json({ success: true, booking: updated });
    }

    const result = await ReservationEngine.modifyBooking({
      bookingId,
      newDate,
      newTime,
      newGuests,
      newNotes,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    Logger.error("Errore aggiornamento prenotazione:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

/**
 * DELETE: Cancella prenotazione
 */
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const bookingId = searchParams.get("id");

    if (!bookingId) {
      return NextResponse.json({ error: "ID prenotazione obbligatorio" }, { status: 400 });
    }

    const result = await ReservationEngine.cancelBooking(bookingId);
    return NextResponse.json(result);
  } catch (error: any) {
    Logger.error("Errore cancellazione prenotazione:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
