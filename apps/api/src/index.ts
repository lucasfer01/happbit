import 'dotenv/config'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import Fastify from 'fastify'

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

app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`
  return { ok: true }
})

const port = Number(process.env.PORT ?? 3001)
app.listen({ port, host: '0.0.0.0' })
