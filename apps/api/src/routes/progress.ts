import type { FastifyInstance } from "fastify";

type ProgressQuery = { weekStart?: string };

function parseYYYYMMDD(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [yStr, mStr, dStr] = value.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  const dt = new Date(Date.UTC(y, m - 1, d));
  // valida fecha real (ej 2026-02-30 inválida)
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function addDaysUTC(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function todayUTCDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function progressRoutes(app: FastifyInstance) {
  /**
   * GET /progress?weekStart=YYYY-MM-DD
   * Devuelve por hábito:
   * - checkinsCountWeek (weekStart..weekStart+6 inclusive)
   * - checkedToday (si existe check-in para hoy UTC)
   */
  app.get<{ Querystring: ProgressQuery }>("/progress", async (req, reply) => {
    const weekStartStr = String(req.query.weekStart ?? "");

    if (!weekStartStr) {
      return reply.code(400).send({ error: "weekStart is required (YYYY-MM-DD)" });
    }

    const weekStart = parseYYYYMMDD(weekStartStr);
    if (!weekStart) {
      return reply.code(400).send({ error: "Invalid weekStart. Use YYYY-MM-DD" });
    }

    const weekEnd = addDaysUTC(weekStart, 6);
    const today = todayUTCDateOnly();

    // 1) hábitos (para incluir también los que tienen 0 checkins)
    const habits = await app.prisma.habit.findMany({
      select: { id: true },
    });

    if (habits.length === 0) {
      return reply.code(200).send([]);
    }

    // 2) conteo semanal por hábito
    const weekCounts = await app.prisma.checkin.groupBy({
      by: ["habitId"],
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      _count: { _all: true },
    });

    // 3) cuáles tienen check-in hoy
    const todayCheckins = await app.prisma.checkin.findMany({
      where: { date: today },
      select: { habitId: true },
    });

    const countMap = new Map<string, number>(
      weekCounts.map((x) => [String(x.habitId), Number(x._count._all)])
    );
    const todaySet = new Set<string>(todayCheckins.map((x) => String(x.habitId)));

    const items = habits.map((h) => ({
      habitId: String(h.id),
      checkinsCountWeek: countMap.get(String(h.id)) ?? 0,
      checkedToday: todaySet.has(String(h.id)),
    }));

    return reply.code(200).send(items);
  });
}
