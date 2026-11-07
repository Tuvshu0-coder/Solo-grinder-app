# Solo Grinding

Хичээлийг тоглоом болгох систем — Next.js 15 + Prisma + SQLite.
Implements the requirements in `../section8_revised_mn.txt` (rules 1–22).

## Run

```bash
npm install
npm run db:setup     # create prisma/dev.db and seed levels, quests, achievements, admin
npm run dev          # http://localhost:3000
```

Logins: **admin / admin123** (admin panel). Register a new account for a student.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build |
| `npm test` | Unit tests for the pure rules (`src/lib/rules.test.ts`) |
| `npm run test:integration` | Engine end-to-end on a scratch `prisma/test.db` |
| `npm run db:reset` | Wipe and reseed `dev.db` (**deletes all data**) |

## Where things live

| Path | Contents |
|---|---|
| `prisma/schema.prisma` | ERD (section 9) + review additions |
| `prisma/seed.ts` | Levels 1–60 (20·L²), quest templates, achievements, admin |
| `src/lib/rules.ts` | Pure rule functions: multiplier, cap, deadline, streak |
| `src/lib/game.ts` | Engine: `grantXp`, `completeTask`, quests, achievements, maintenance |
| `src/lib/guild.ts` | Membership removal / succession, weekly leaderboard |
| `src/lib/time.ts` | Mongolia-time (UTC+8) day/week boundaries |
| `src/actions/*` | Server actions (forms) |
| `src/app/(app)/*` | Student pages · `src/app/admin/*` admin pages |

## Design notes

- **No cron.** The "00:00 job" (late tasks, streak reset) runs lazily on each page load;
  daily quests are assigned on the user's first visit of the day; weekly data is keyed by
  Monday's date, so it rolls over on its own.
- **Every XP change goes through `grantXp()`**, which enforces the 400/day cap and writes `XpLog`.
- Kicking a member does **not** start the 7-day cooldown (only leaving voluntarily does).
