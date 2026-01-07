### Checkins

POST /habits/:id/checkins
- Creates today's check-in (UTC date-only)
- Idempotent per day (unique habitId+date)

GET /habits/:id/checkins?from=YYYY-MM-DD&to=YYYY-MM-DD
- Returns check-ins for a date range (inclusive)

Examples:
curl -i -X POST http://localhost:3333/habits/<HABIT_ID>/checkins
curl -s "http://localhost:3333/habits/<HABIT_ID>/checkins?from=2026-01-05&to=2026-01-11"
