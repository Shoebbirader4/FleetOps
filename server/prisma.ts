import prismaClient from "@prisma/client";

const { PrismaClient } = prismaClient;
type PrismaClientInstance = InstanceType<typeof PrismaClient>;
const globalForPrisma = globalThis as unknown as { fleetopsPrisma?: PrismaClientInstance };

export const prisma = globalForPrisma.fleetopsPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.fleetopsPrisma = prisma;
