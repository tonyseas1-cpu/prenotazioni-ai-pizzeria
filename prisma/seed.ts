import { PrismaClient, PlanTier, Role, BookingStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Popolamento database SaaS in corso...");

  // 1. Piani SaaS
  const plans = [
    {
      tier: PlanTier.FREE,
      name: "Piano Free Trial",
      monthlyPrice: 0.0,
      maxBookings: 50,
      maxMessages: 500,
      features: { whatsapp: true, ai_agent: true, basic_stats: true },
    },
    {
      tier: PlanTier.STARTER,
      name: "Piano Starter",
      monthlyPrice: 49.0,
      maxBookings: 300,
      maxMessages: 3000,
      features: { whatsapp: true, ai_agent: true, advanced_stats: true, custom_prompt: true },
    },
    {
      tier: PlanTier.PRO,
      name: "Piano Pro",
      monthlyPrice: 99.0,
      maxBookings: 1000,
      maxMessages: 10000,
      features: { whatsapp: true, ai_agent: true, advanced_stats: true, custom_prompt: true, multi_user: true },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }
  console.log("✅ Piani SaaS registrati");

  // 2. Ristorante Pilota
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "pizzeria-la-bella-chieri" },
    update: {
      name: "Pizzeria La Bella Chieri",
      phone: "+390119421234",
      address: "Via Vittorio Emanuele II, 42, 10023 Chieri (TO)",
      timezone: "Europe/Rome",
      description: "Autentica pizza napoletana e cucina tradizionale piemontese a Chieri.",
    },
    create: {
      name: "Pizzeria La Bella Chieri",
      slug: "pizzeria-la-bella-chieri",
      phone: "+390119421234",
      address: "Via Vittorio Emanuele II, 42, 10023 Chieri (TO)",
      timezone: "Europe/Rome",
      description: "Autentica pizza napoletana e cucina tradizionale piemontese a Chieri.",
    },
  });

  // 3. Impostazioni Ristorante
  await prisma.restaurantSettings.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      maxCapacityPerSlot: 40,
      slotDurationMinutes: 90,
      minNoticeHours: 1,
      maxNoticeDays: 30,
      minGuests: 1,
      maxGuests: 12,
      allowSameDay: true,
      autoConfirm: true,
    },
    create: {
      restaurantId: restaurant.id,
      maxCapacityPerSlot: 40,
      slotDurationMinutes: 90,
      minNoticeHours: 1,
      maxNoticeDays: 30,
      minGuests: 1,
      maxGuests: 12,
      allowSameDay: true,
      autoConfirm: true,
    },
  });

  // 4. Orari Settimanali (Pranzo 12:00-14:30, Cena 19:00-23:00, Mercoledì Chiuso)
  await prisma.restaurantHours.deleteMany({ where: { restaurantId: restaurant.id } });

  const hoursData = [];
  for (let day = 0; day <= 6; day++) {
    const isWed = day === 3; // 3 = Mercoledì
    if (isWed) {
      hoursData.push({
        restaurantId: restaurant.id,
        dayOfWeek: day,
        shiftName: "whole_day",
        openTime: "00:00",
        closeTime: "00:00",
        isClosed: true,
      });
    } else {
      // Turno Pranzo
      hoursData.push({
        restaurantId: restaurant.id,
        dayOfWeek: day,
        shiftName: "lunch",
        openTime: "12:00",
        closeTime: "14:30",
        isClosed: false,
      });
      // Turno Cena
      hoursData.push({
        restaurantId: restaurant.id,
        dayOfWeek: day,
        shiftName: "dinner",
        openTime: "19:00",
        closeTime: "23:00",
        isClosed: false,
      });
    }
  }
  await prisma.restaurantHours.createMany({ data: hoursData });

  // 5. Personalità Agente IA
  await prisma.agentPersona.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      agentName: "Mia",
      tone: "cordiale",
      emojiEnabled: true,
      welcomeMessage: "Ciao! Sono Mia, l'assistente virtuale di Pizzeria La Bella Chieri. Come posso aiutarti oggi?",
      customRules: "Per tavolate superiori a 10 persone, consiglia di contattare telefonicamente il locale.",
    },
    create: {
      restaurantId: restaurant.id,
      agentName: "Mia",
      tone: "cordiale",
      emojiEnabled: true,
      welcomeMessage: "Ciao! Sono Mia, l'assistente virtuale di Pizzeria La Bella Chieri. Come posso aiutarti oggi?",
      customRules: "Per tavolate superiori a 10 persone, consiglia di contattare telefonicamente il locale.",
    },
  });

  // 6. Configurazione WhatsApp Account (Mock / Demo)
  await prisma.whatsAppAccount.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      displayPhone: "+390119421234",
      provider: "mock",
      isActive: true,
    },
    create: {
      restaurantId: restaurant.id,
      displayPhone: "+390119421234",
      provider: "mock",
      isActive: true,
    },
  });

  // 7. Utente Demo Admin
  await prisma.user.upsert({
    where: { email: "admin@labellachieri.it" },
    update: {
      name: "Marco Rossi (Gestore)",
      role: Role.ADMIN,
      restaurantId: restaurant.id,
    },
    create: {
      email: "admin@labellachieri.it",
      name: "Marco Rossi (Gestore)",
      passwordHash: "demo_hash_password_123",
      role: Role.ADMIN,
      restaurantId: restaurant.id,
    },
  });

  // 8. Cliente di prova con prenotazione
  const customer = await prisma.customer.upsert({
    where: {
      restaurantId_whatsappPhone: {
        restaurantId: restaurant.id,
        whatsappPhone: "+393401234567",
      },
    },
    update: { name: "Giuseppe Verdi" },
    create: {
      restaurantId: restaurant.id,
      whatsappPhone: "+393401234567",
      name: "Giuseppe Verdi",
    },
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const existingBooking = await prisma.booking.findFirst({
    where: {
      restaurantId: restaurant.id,
      customerId: customer.id,
      date: todayStr,
    },
  });

  if (!existingBooking) {
    const booking = await prisma.booking.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        date: todayStr,
        time: "20:30",
        guests: 4,
        status: BookingStatus.CONFIRMED,
        notes: "Tavolo preferibilmente vicino alla finestra",
      },
    });

    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        eventType: "CREATED",
        details: "Prenotazione seed creata con successo",
      },
    });
  }

  console.log(`✅ Seed completato con successo per ${restaurant.name} (${restaurant.slug})!`);
}

main()
  .catch((e) => {
    console.error("❌ Errore durante il seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });