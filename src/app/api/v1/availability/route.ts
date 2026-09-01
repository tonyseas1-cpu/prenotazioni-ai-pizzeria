import { NextRequest, NextResponse } from "next/server";
import { ReservationEngine } from "@/core/reservation/reservationEngine";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const slug = searchParams.get("slug") || "pizzeria-la-bella-chieri";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const time = searchParams.get("time");
    const guests = Number(searchParams.get("guests")) || 2;

    if (time) {
      const result = await ReservationEngine.checkAvailability(slug, date, time, guests);
      return NextResponse.json(result);
    } else {
      const slots = await ReservationEngine.getAvailableTimes(slug, date, guests);
      return NextResponse.json({ date, guests, availableTimes: slots });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
