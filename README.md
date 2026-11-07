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
| `npm run db:demo` | Fill the `demo` account (demo / demo123) with 10 days of realistic activity — resets only that account |

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

## Pixel UI

The look is defined in `design/` (see `design/STYLE_GUIDE.md`; open `design/style-guide.html` for a preview).

- `python -P design/build-style-guide.py` — rebuilds the style-guide preview
- `python -P design/build-app-assets.py` — regenerates `src/app/pixel.css` (palette + pixel frames) and
  `src/lib/sprites.ts` (character, coin, icons). Never edit those two generated files by hand.
- Sprites are palette arrays rendered by `<Sprite>` / `<Hero>` in `src/components/pixel.tsx`.

## Credits

- Font: **Departure Mono** © Helena Zhang — SIL Open Font License 1.1 (`src/app/fonts/DepartureMono-OFL.txt`).
- Starter character design: supplied by the team. If it comes from a third-party artist, add their name
  and license here.

## Design notes

- **No cron.** The "00:00 job" (late tasks, streak reset) runs lazily on each page load;
  daily quests are assigned on the user's first visit of the day; weekly data is keyed by
  Monday's date, so it rolls over on its own.
- **Every XP change goes through `grantXp()`**, which enforces the 400/day cap and writes `XpLog`.
- Kicking a member does **not** start the 7-day cooldown (only leaving voluntarily does).
