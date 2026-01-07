import { z } from "zod";
import type { FastifyInstance } from "fastify";

const createHabitSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(80, "max 80 chars"),
});

export async function habitsRoutes(app: FastifyInstance) {
  app.post("/habits", async (req, reply) => {
    const parsed = createHabitSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
    }

    const habit = await app.prisma.habit.create({
      data: { name: parsed.data.name },
    });

    return reply.status(201).send(habit);
  });

  app.get("/habits", async (_req, reply) => {
    const habits = await app.prisma.habit.findMany({
      // Si tu modelo NO tiene createdAt, borrá este orderBy
      orderBy: { createdAt: "desc" as const },
    });

    return reply.status(200).send(habits);
  });
}
