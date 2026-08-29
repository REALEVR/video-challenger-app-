import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance (standard Node singleton pattern —
// avoids exhausting DB connections when tsx watch reloads modules).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
