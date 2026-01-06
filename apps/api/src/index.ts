import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'

const app = Fastify({ logger: true })
const prisma = new PrismaClient()

await app.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
})

app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`
  return { ok: true }
})

const port = Number(process.env.PORT ?? 3001)
app.listen({ port, host: '0.0.0.0' })
