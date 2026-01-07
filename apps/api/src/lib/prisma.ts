import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL (create apps/api/.env or export env var).');
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
