import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { fleetopsPrisma?: PrismaClient };

export const prisma = globalForPrisma.fleetopsPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.fleetopsPrisma = prisma;
