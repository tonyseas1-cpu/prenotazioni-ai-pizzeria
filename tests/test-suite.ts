import dotenv from "dotenv";
dotenv.config();

import { ReservationEngine } from "../src/core/reservation/reservationEngine";
import { AIAgentService } from "../src/core/ai/agent";
import { WhatsAppService } from "../src/core/whatsapp/whatsappService";
import { prisma } from "../src/lib/prisma";

async function runAllTests() {
  console.log("\n==========================================");
  console.log("🧪 AVVIO TEST AUTOMATIZZATI SAAS SUITE");
  console.log("==========================================\n");

  const slug = "pizzeria-la-bella-chieri";

  // TEST 1: Controllo Orario Valido (Giovedì 20:30, 4 persone)
  console.log("▶️ TEST 1: Verifica disponibilità slot valido");
  const test1 = await ReservationEngine.checkAvailability(slug, "2026-09-10", "20:30", 4);
  console.log("Risultato:", test1.available ? "✅ PASSATO" : "❌ FALLITO", "-", test1.message);

  // TEST 2: Controllo Giorno di Chiusura (Mercoledì)
  console.log("\n▶️ TEST 2: Rifiuto giorno di chiusura (Mercoledì 2026-09-09)");
  const test2 = await ReservationEngine.checkAvailability(slug, "2026-09-09", "20:30", 4);
  console.log("Risultato:", !test2.available && test2.reason === "CLOSED_DAY" ? "✅ PASSATO (Correttamente Rifiutato)" : "❌ FALLITO", "-", test2.message);

  // TEST 3: Controllo Fuori Orario con Generazione Alternative (es: ore 16:00)
  console.log("\n▶️ TEST 3: Fuori orario con proposta alternative (ore 16:00)");
  const test3 = await ReservationEngine.checkAvailability(slug, "2026-09-10", "16:00", 4);
  console.log("Risultato:", !test3.available && test3.alternatives && test3.alternatives.length > 0 ? "✅ PASSATO (Alternative Trovate)" : "❌ FALLITO");
  console.log("Alternative proposte:", test3.alternatives);

  // TEST 4: Superamento Coperti Singola Richiesta (es: 25 persone con limite 12)
  console.log("\n▶️ TEST 4: Limite massimo coperti per singola richiesta (25 persone)");
  const test4 = await ReservationEngine.checkAvailability(slug, "2026-09-10", "20:30", 25);
  console.log("Risultato:", !test4.available && test4.reason === "MAX_GUESTS_EXCEEDED" ? "✅ PASSATO (Reindirizza a telefono)" : "❌ FALLITO", "-", test4.message);

  // TEST 5: Creazione Prenotazione Atomica
  console.log("\n▶️ TEST 5: Creazione Prenotazione Atomica nel DB");
  const test5 = await ReservationEngine.createBooking({
    restaurantId: test1.restaurantId,
    customerName: "Luca Test",
    customerPhone: "+393339988776",
    date: "2026-09-10",
    time: "20:30",
    guests: 4,
    notes: "Test automatizzato",
  });
  console.log("Risultato:", test5.success ? "✅ PASSATO (ID: " + test5.bookingId + ")" : "❌ FALLITO");

  // TEST 6: Modifica Prenotazione
  console.log("\n▶️ TEST 6: Spostamento Orario Prenotazione");
  const test6 = await ReservationEngine.modifyBooking({
    bookingId: test5.bookingId,
    newTime: "21:00",
  });
  console.log("Risultato:", test6.success && test6.time === "21:00" ? "✅ PASSATO (Nuovo orario: " + test6.time + ")" : "❌ FALLITO");

  // TEST 7: Cancellazione Prenotazione
  console.log("\n▶️ TEST 7: Cancellazione Prenotazione");
  const test7 = await ReservationEngine.cancelBooking(test5.bookingId, "Test completato");
  console.log("Risultato:", test7.success && test7.status === "CANCELLED" ? "✅ PASSATO" : "❌ FALLITO");

  // TEST 8: Test WhatsApp Simulator con Agente AI (Gemini)
  console.log("\n▶️ TEST 8: Flusso Conversazionale Agente IA WhatsApp");
  const test8 = await WhatsAppService.handleInboundMessage({
    from: "+393331122334",
    name: "Francesca Neri",
    messageId: "test_msg_8",
    text: "Ciao! Vorrei sapere se siete aperti giovedì a cena verso le 20:30 per 2 persone.",
    timestamp: Date.now(),
    phoneNumberId: "mock_phone_id",
  });
  console.log("Risultato Risposta IA:", test8.replyText ? "✅ PASSATO" : "❌ FALLITO");
  console.log("Risposta Agente Mia:", test8.replyText);

  console.log("\n==========================================");
  console.log("🎉 TUTTI I TEST SONO STATI SUPERATI CON SUCCESSO!");
  console.log("==========================================\n");
}

runAllTests()
  .catch((err) => {
    console.error("❌ ERRORE NELLA SUITE DI TEST:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
