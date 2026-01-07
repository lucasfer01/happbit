import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma"; // ajustá el path si difiere

type Params = { id: string };
type QueryRange = { from?: string; to?: string };

function parseYYYYMMDD(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [yStr, mStr, dStr] = value.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  const dt = new Date(Date.UTC(y, m - 1, d));
  // valida que la fecha exista (ej: 2026-02-30)
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function todayUTCDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function habitCheckinsRoutes(app: FastifyInstance) {
  /**
   * POST /habits/:id/checkins
   * Crea check-in para "hoy" (medianoche UTC).
   * Idempotente por día con @@unique([habitId, date]) -> P2002.
   */
  app.post<{ Params: Params }>("/habits/:id/checkins", async (req, reply) => {
    const habitId = req.params.id;

    if (!habitId || typeof habitId !== "string") {
      return reply.code(400).send({ error: "Invalid habit id" });
    }

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) {
      return reply.code(404).send({ error: "Habit not found" });
    }

    const date = todayUTCDateOnly();

    try {
      const created = await prisma.checkin.create({
        data: { habitId, date },
      });

      return reply.code(201).send({
        created: true,
        checkin: created,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Prisma genera el campo compuesto "habitId_date" para @@unique([habitId, date])
        const existing = await prisma.checkin.findUnique({
          where: { habitId_date: { habitId, date } },
        });

        if (!existing) {
          // muy raro, pero dejamos fallback seguro
          return reply.code(500).send({ error: "Unique constraint hit but checkin not found" });
        }

        return reply.code(200).send({
          created: false,
          checkin: existing,
        });
      }

      req.log.error({ err }, "Failed to create checkin");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  /**
   * GET /habits/:id/checkins?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Opción B (más simple): devuelve checkins del rango (inclusive).
   */
  app.get<{ Params: Params; Querystring: QueryRange }>(
    "/habits/:id/checkins",
    async (req, reply) => {
      const habitId = req.params.id;
      const { from, to } = req.query;

      if (!habitId || typeof habitId !== "string") {
        return reply.code(400).send({ error: "Invalid habit id" });
      }

      if (!from || !to) {
        return reply
          .code(400)
          .send({ error: "Query params 'from' and 'to' are required (YYYY-MM-DD)" });
      }

      const fromDate = parseYYYYMMDD(from);
      const toDate = parseYYYYMMDD(to);

      if (!fromDate || !toDate) {
        return reply.code(400).send({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      if (fromDate.getTime() > toDate.getTime()) {
        return reply.code(400).send({ error: "'from' must be <= 'to'" });
      }

      const habit = await prisma.habit.findUnique({ where: { id: habitId } });
      if (!habit) {
        return reply.code(404).send({ error: "Habit not found" });
      }

      const checkins = await prisma.checkin.findMany({
        where: {
          habitId,
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: { date: "asc" },
      });

      return reply.code(200).send({
        habitId,
        from,
        to,
        count: checkins.length,
        checkins,
      });
    }
  );
}
