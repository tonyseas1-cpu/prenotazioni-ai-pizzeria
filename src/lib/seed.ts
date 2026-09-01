import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Assicura la presenza della tabella Tenant su Neon PostgreSQL
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

  // 2. Inserisce il ristorante di demo
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Tenant" ("id", "name", "slug", "phone", "maxCapacity", "createdAt", "updatedAt")
    VALUES ('tenant_demo', 'Pizzeria La Bella Chieri', 'pizzeria-la-bella-chieri', '+393331234567', 40, NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING;
  `);

  console.log("✅ Tabella creata e ristorante 'tenant_demo' registrato con successo nel DB Neon!");
}

main()
  .catch((e) => console.error("❌ Errore seed SQL:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });