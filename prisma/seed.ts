import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Popolamento database in corso...");

  // Creazione Ristorante di prova
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "pizzeria-la-bella-chieri" },
    update: {},
    create: {
      name: "Pizzeria La Bella Chieri",
      slug: "pizzeria-la-bella-chieri",
      phone: "+390111234567",
      address: "Via Vittorio Emanuele II, Chieri",
    },
  });

  console.log(`✅ Ristorante pronto: ${restaurant.name} (Slug: ${restaurant.slug})`);
}

main()
  .catch((e) => {
    console.error("Errore durante il seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });