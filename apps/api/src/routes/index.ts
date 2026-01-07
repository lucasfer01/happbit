import type { FastifyInstance } from "fastify";
import { habitCheckinsRoutes } from "./habits/checkins";
import { habitsRoutes } from "./habits/habits";

export async function routes(app: FastifyInstance) {
  // ...ya tenés otras
  await app.register(habitsRoutes);
  await app.register(habitCheckinsRoutes);
}
