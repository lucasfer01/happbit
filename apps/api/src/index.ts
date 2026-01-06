import 'dotenv/config'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import Fastify from 'fastify'
import { habitsRoutes } from "./routes/habits";
// import prismaPlugin from "./plugins/prisma";

const app = Fastify({ logger: true })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Missing DATABASE_URL (create apps/api/.env or export env var).')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

await app.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
})

// app.register(prismaPlugin);

app.decorate("prisma", prisma);

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

app.register(habitsRoutes);

app.get("/health", async () => {
  await app.prisma.$queryRaw`SELECT 1`;
  return { ok: true };
});

const port = Number(process.env.PORT ?? 3001)
app.listen({ port, host: '0.0.0.0' })
