import 'dotenv/config'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import { prisma } from './lib/prisma';
import { routes } from './routes';
// import prismaPlugin from "./plugins/prisma";

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
})

// app.register(prismaPlugin);

app.decorate("prisma", prisma);

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

await app.register(routes);

app.get("/health", async () => {
  await app.prisma.$queryRaw`SELECT 1`;
  return { ok: true };
});

const port = Number(process.env.PORT ?? 3001)
app.listen({ port, host: '0.0.0.0' })
