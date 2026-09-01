import dotenv from "dotenv";
dotenv.config();

import readline from "readline";
import { PrismaClient } from "@prisma/client";
import { processUserMessage } from "./aiAgent";
import { ReservationEngine } from "./reservationEngine";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string) =>
  new Promise<string>((resolve) => rl.question(query, resolve));

async function ensureTenantExists() {
  const tenantId = "tenant_demo";
  
  // Acceso sicuro sia a prisma.tenant che prisma.Tenant
  const tenantModel = (prisma as any).tenant || (prisma as any).Tenant;

  if (!tenantModel) {
    console.log("⚠️ Modello Tenant non trovato sul client Prisma, continuo con ID demo.");
    return { id: tenantId, name: "Pizzeria La Bella Chieri" };
  }

  const existing = await tenantModel.findUnique({ where: { id: tenantId } });

  if (!existing) {
    const created = await tenantModel.create({
      data: {
        id: tenantId,
        name: "Pizzeria La Bella Chieri",
        slug: "pizzeria-la-bella-chieri",
        phone: "+393331234567",
        maxCapacity: 40,
      },
    });
    console.log(`✅ Tenant creato nel DB: ${created.name} (${created.id})`);
    return created;
  }

  console.log(`✅ Tenant trovato nel DB: ${existing.name} (${existing.id})`);
  return existing;
}

async function runInteractiveDemo() {
  const tenant = await ensureTenantExists();

  console.log("\n🚀 Chat Interattiva Attiva! Scrivi il tuo messaggio nel terminale (digita 'exit' per uscire).\n");

  const restaurantContext = {
    name: tenant.name,
    timezone: "Europe/Rome",
    currentDate: new Date().toISOString().split("T")[0],
  };

  const history: { role: "user" | "model"; parts: { text: string }[] }[] = [];

  while (true) {
    const userMsg = await askQuestion("📱 Tu: ");
    if (userMsg.toLowerCase() === "exit") {
      rl.close();
      await prisma.$disconnect();
      break;
    }

    let response = await processUserMessage(userMsg, history, restaurantContext);
    history.push({ role: "user", parts: [{ text: userMsg }] });

    if (response.type === "TOOL_CALL") {
      console.log(`\n⚙️  [Tool Call Rilevata]: ${response.name}`, response.args);

      let toolResult: any;

      if (response.name === "checkAvailability") {
        const { date, time, guests } = response.args as any;
        toolResult = await ReservationEngine.checkAvailability(
          tenant.id,
          date,
          time,
          Number(guests)
        );
        console.log("🔍  [Risultato DB]:", toolResult);
      } else if (response.name === "createBooking") {
        const { customerName, date, time, guests, notes } = response.args as any;
        
        const bookingPayload: any = {
          tenantId: tenant.id,
          name: customerName,
          customerName: customerName,
          phone: "+393331234567",
          date,
          time,
          guests: Number(guests),
          notes: notes || "",
        };

        toolResult = await (ReservationEngine as any).createBooking(bookingPayload);
        console.log("💾 [Risultato DB - Creata]:", toolResult);
      }

      const followUpMsg = `Esito funzione ${response.name}: ${JSON.stringify(toolResult)}`;
      response = await processUserMessage(followUpMsg, history, restaurantContext);
    }

    if (response.type === "TEXT") {
      console.log(`🤖 Agente: ${response.text}\n`);
      history.push({ role: "model", parts: [{ text: response.text }] });
    }
  }
}

runInteractiveDemo().catch(async (e) => {
  console.error("❌ Errore durante l'esecuzione:", e);
  await prisma.$disconnect();
});