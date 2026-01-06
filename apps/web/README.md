# Happbit Web

## Requisitos
- Node 22+
- pnpm

## Setup
1) Copiar env:
   - `cp env.example .env`

2) Instalar deps desde la raíz del monorepo:
   - `pnpm install`

## Correr
Desde la raíz:
- `pnpm --filter web dev --open`

Si el nombre del paquete no es `web`, corré:
- `pnpm -C apps/web dev --open`

## Health check
La home hace GET a: `${VITE_API_URL}/health`
