import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function buildClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.PRISMA_LOG === "true"
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__prisma) globalThis.__prisma = buildClient();
  return globalThis.__prisma;
}

export const prisma = getPrisma();

export type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function withTx<T>(fn: (tx: PrismaTx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}