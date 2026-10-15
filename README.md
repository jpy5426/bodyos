# BodyOS

AI-assisted mobility, prehab and nutrition web app for people who sit most of the day, want to prevent injuries, or want to move better.
IST 440W Senior Capstone, Penn State, Fall 2026.
Author: Ji Mok Yeom

## Features

| Feature | Route | How it works |
| --- | --- | --- |
| Sign up / log in | `/auth/login`, `/auth/sign-up` | Supabase Auth (email + password). |
| AI routine builder | `/protected/workout` → `POST /api/generate-plan` | The user picks a goal (desk relief, injury prevention, mobility), level, focus areas, positions and session length. The Claude API builds three rotating routines by choosing exercises **by number** from a filtered library, so it cannot invent exercises. Doses come from the database, not the AI. Users who report current pain or injury are told to follow a physical therapist's plan instead. |
| Mobility & prehab library | `/protected/library` | 54 low-impact exercises with how-to steps and doses. Filter by focus, body region and position, or search. |
| Macro & calorie calculator | `/protected/macros` | Deterministic math: Mifflin-St Jeor BMR × activity factor, goal adjustment (cut −20% / bulk +15%), calorie floor (1,200 F / 1,500 M), macro split. The user picks a goal; the profile and goal are saved per user. |
| Meal photo estimator | `/protected/meals` → `POST /api/estimate-meal` | **Hybrid AI + database.** Claude (vision) only names the foods and estimates grams. Calories and macros come from **USDA FoodData Central**, and code does the math. The app re-ranks USDA results so the right food wins (e.g. "salmon" never matches "Emu, fan fillet" or "Salmon nuggets"). The user can edit grams, change a match, add a missed food or remove items before saving. |
| USDA food search | `GET /api/food-search?q=` | Used by "Change" and "Add a food". Runs on the server so the USDA key never reaches the browser. |
| Daily tracking | `/protected/meals` | Today's calories, protein, carbs and fat against the goal chosen in the macro calculator. |
| Meal history | `/protected/meals/history` | Last 7 / 14 / 30 days: daily calorie chart with the target line, days within 10% of target, and each meal's foods. |

### Why the AI is used where it is

| Task | Approach | Reason |
| --- | --- | --- |
| Calorie / macro targets | Formulas, no AI | Exact, repeatable, testable. |
| Calories in a meal | AI identifies food + grams; USDA supplies nutrition | Vision models are unreliable at calorie numbers but good at recognizing food. |
| Exercise routines | AI selects and orders from a fixed library | Personalization is a good fit for AI; the library prevents made-up or unsafe exercises. |

## Tech stack

- Next.js 16 (App Router) + React + Tailwind CSS
- Supabase (Postgres, Auth, Row-Level Security)
- Claude API (Anthropic) for routines and meal photo analysis
- USDA FoodData Central API for nutrition data
- `@finegym/fitness-calc` for BMR / TDEE math

## Project structure (key files)

```
app/
  api/generate-plan/route.ts    AI routine builder
  api/estimate-meal/route.ts    Meal photo → foods + grams → USDA → totals
  api/food-search/route.ts      USDA search for change-match / add-food
  protected/workout/            Routine builder UI
  protected/library/            Exercise library UI
  protected/macros/             Macro calculator + goal
  protected/meals/              Meal photo estimator + today's totals
  protected/meals/history/      Meal history
lib/
  claude.ts                     Claude API call + JSON extraction
  usda.ts                       USDA search, nutrient parsing, result ranking
  nutrition.ts                  Portion math (grams × per-100 g)
  macros.ts                     Macro targets + calorie floor (shared)
supabase/                       SQL to rebuild the database
```

## Run it on your own computer

### 1. Prerequisites

- Node.js 20 or newer (`node -v`)
- Git
- A free Supabase account: <https://supabase.com>
- An Anthropic API key: <https://console.anthropic.com>
- A free USDA FoodData Central API key: <https://fdc.nal.usda.gov/api-key-signup>

### 2. Get the code

```bash
git clone https://github.com/jpy5426/bodyos.git
cd bodyos
npm install
```

### 3. Create the database

1. In Supabase, click **New project** (free tier is fine).
2. Open **SQL Editor → New query**. Run each file in the `supabase/` folder **once, in order**: paste its full contents, click **Run**, then do the next file.
   - `01_workout_and_catalog.sql`: exercise catalog and workout plan tables
   - `02_mobility_library.sql`: mobility / prehab / sedentary columns and exercises
   - `03_macro_profiles.sql`: saved macro calculator profiles
   - `04_routine_dose.sql`: stores each exercise's dose on saved routines
   - `05_fill_original_exercises.sql`: how-to steps, body regions and doses for the original exercises
   - `05_meal_logs.sql`: saved meals and their food items
   - `06_macro_goal.sql`: the goal (maintain / cut / bulk) on the macro profile
3. Check **Table Editor**. You should see `macro_profiles`, `exercises`, `workout_plans`, `plan_days`, `plan_exercises`, `meal_logs` and `meal_items`.
4. For quick testing, go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email**, so new accounts can log in without clicking an email link.

### 4. Add your keys

```bash
cp .env.example .env.local
```

(On Windows Command Prompt: `copy .env.example .env.local`)

Fill in `.env.local`:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API keys (publishable key) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-haiku-4-5-20251001` |
| `USDA_API_KEY` | Emailed after signing up at fdc.nal.usda.gov |

### 5. Start it

```bash
npm run dev
```

Open <http://localhost:3000>, sign up, and use the cards on the home page.

## Security and privacy

- `.env.local` is git-ignored. API keys are only used in server routes, never sent to the browser.
- Every user table uses Row-Level Security, so users can only read and change their own rows.
- Meal photos are sent to the Claude API for analysis and are **not stored**. Only food names, grams and numbers are saved.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "The AI service is unavailable" | `ANTHROPIC_API_KEY` is missing or wrong. Fix `.env.local` and restart `npm run dev`. |
| Foods show "No USDA match" for everything | `USDA_API_KEY` is missing or wrong. Fix `.env.local` and restart. |
| Can't log in after signing up | Turn off **Confirm email** (step 3.4) or click the link in the email. |
| `relation "..." does not exist` | A SQL file wasn't run. Run the missing file from step 3. |
| "Calculated, but saving failed: ... goal" | Run `06_macro_goal.sql`. |

## Disclaimer

For prevention and general wellness only. Not medical or dietary advice. Photo portion estimates can be off by 20–30%.
