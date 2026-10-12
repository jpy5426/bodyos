# BodyOS

AI-assisted mobility, prehab and wellness web app for people who sit most of the day, want to prevent injuries, or want to move better. IST 440W Senior Capstone, Penn State, Fall 2026.
Author: Ji Mok Yeom

## What works in the Base Implementation

| Feature | Route | How it works |
|---|---|---|
| Sign up / log in | `/auth/login`, `/auth/sign-up` | Supabase Auth (email + password) |
| AI mobility & prehab routine builder | `/protected/workout` → `POST /api/generate-plan` | User picks a goal (desk relief, injury prevention, mobility), activity level, focus areas, where they can exercise and minutes per session. The app filters the library to exercises they can do; the Claude API picks and orders them **by number only** (it can't invent exercises) and writes form cues. Doses come from the library, routine length from the minutes chosen. "Current pain or injury" stops the request and refers the user to a physical therapist. 3 rotating routines saved to Supabase. |
| Mobility & prehab library | `/protected/library` | 54 low-impact exercises (desk & sedentary, prehab, mobility) with how-to steps and dosage. Filter by focus, body region and position, or search by name or muscle. |
| Macro & calorie calculator | `/protected/macros` | Deterministic math: Mifflin-St Jeor BMR × activity factor, goal adjustment (cut −20% / bulk +15%), calorie floor (1,200 F / 1,500 M), macro split. Profile saved per user in Supabase. |
| Home page | `/protected` | Links to all three features. |

Planned for the Enhanced Implementation: photo-based meal calorie estimation (vision model identifies foods and grams; calories come from USDA FoodData Central).

## Tech stack

- Next.js 16 (App Router) + React + Tailwind CSS
- Supabase (Postgres, Auth, Row-Level Security)
- Claude API (Anthropic) for routine generation
- `@finegym/fitness-calc` for BMR / TDEE math

## Run it on your own computer

### 1. Prerequisites
- Node.js 20 or newer (`node -v`)
- Git
- A free Supabase account: https://supabase.com
- An Anthropic API key: https://console.anthropic.com

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
   - `04_routine_dose.sql`: stores each exercise's dose in saved routines
3. Check **Table Editor**. You should see `macro_profiles`, `exercises`, `workout_plans`, `plan_days` and `plan_exercises`.
4. For quick testing, go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email**, so new accounts can log in without clicking an email link.

### 4. Add your keys
Copy the example file:
```bash
cp .env.example .env.local
```
(On Windows Command Prompt: `copy .env.example .env.local`)

Fill in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase → **Project Settings → API Keys**
- `ANTHROPIC_API_KEY`: Anthropic Console → **API Keys**

### 5. Start the app
```bash
npm run dev
```
Open http://localhost:3000, click **Sign up**, create an account, then try:
- **Macros:** go to `/protected/macros`, enter your stats, click **Calculate**. "Profile saved." confirms the database write.
- **Routines:** go to `/protected/workout`, pick a goal, level, position and minutes, tick a body area or two, and click **Build my routine**. Three routines (A, B, C) appear and are saved to `workout_plans`. Ticking "I have current pain or an injury" shows the safety message instead.
- **Library:** go to `/protected/library` and switch between the Desk & Sedentary, Prehab and Mobility tabs.

## Project structure (key files)

```
app/
  auth/                     login, sign-up, password reset (Supabase starter)
  protected/page.tsx        home page with links to each feature
  protected/macros/page.tsx macro & calorie calculator
  protected/library/page.tsx mobility & prehab library
  protected/workout/page.tsx routine builder intake form + routine display
  api/generate-plan/route.ts Claude API call + plan validation + database save
lib/supabase/               Supabase client helpers
supabase/*.sql              tables, row-level security policies, exercise data (run in order)
```

## Security notes
- `.env.local` is git-ignored. Never commit real keys.
- Every user table uses Row-Level Security: a user can read and write only their own rows. The exercise catalog is read-only for signed-in users.

## Troubleshooting
- **"AI service is unavailable" from the routine builder:** check `ANTHROPIC_API_KEY` in `.env.local`, then stop and restart `npm run dev`. Next.js only reads env files at startup.
- **Can't log in after signing up:** turn off "Confirm email" (step 3.4) or click the link in the confirmation email.
- **"relation does not exist" errors:** one of the `supabase/` files wasn't run in your Supabase project.
