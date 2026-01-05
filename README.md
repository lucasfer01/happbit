# happbits

Monorepo: `apps/web` (Vite React TS) + `apps/api` (Fastify TS) + Postgres (Docker).

## Requisitos
- Node >= 20
- pnpm
- Docker

## Comandos
- Instalar: `pnpm i`
- Dev (web + api): `pnpm dev`
- Formato/Lint: `pnpm format` / `pnpm lint`

## DB (cuando esté docker-compose.yml)
- Levantar: `pnpm db:up`
- Bajar: `pnpm db:down`
- Logs: `pnpm db:logs`
