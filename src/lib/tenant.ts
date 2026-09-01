import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Funzione di isolamento dati multi-tenant
export async function getTenantContext(restaurantSlug: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug },
    include: {
      settings: true,
      hours: true,
      agentPersona: true,
    },
  });

  if (!restaurant) {
    throw new Error(`Ristorante con slug '${restaurantSlug}' non trovato.`);
  }

  return restaurant;
}