# BodyOS

AI-assisted fitness and nutrition web app. IST 440W Senior Capstone, Penn State, Fall 2026.
Author: Ji Mok Yeom

## What works in the Base Implementation

| Feature | Route | How it works |
|---|---|---|
| Sign up / log in | `/auth/login`, `/auth/sign-up` | Supabase Auth (email + password) |
| Macro & calorie calculator | `/protected/macros` | Deterministic math: Mifflin-St Jeor BMR × activity factor, goal adjustment (cut −20% / bulk +15%), calorie floor (1,200 F / 1,500 M), macro split. Profile saved per user in Supabase. |
| AI workout plan generator | `/protected/workout` → `POST /api/generate-plan` | Claude API generates a plan by picking exercises **by number** from the exercise catalog stored in Supabase (prevents made-up exercises). Sets, reps and rest are applied by deterministic rules per fitness level. Plan saved to Supabase. |
| Mobility & prehab library | `/protected/library` | 54 low-impact exercises (desk & sedentary, prehab, mobility) with how-to steps and dosage. Filter by focus, body region and position, or search by name or muscle. |
| Home page | `/protected` | Links to all three features. |

Planned for the Enhanced Implementation: photo-based meal calorie estimation (vision model identifies foods and grams; calories come from USDA FoodData Central).

## Tech stack

- Next.js 16 (App Router) + React + Tailwind CSS
- Supabase (Postgres, Auth, Row-Level Security)
- Claude API (Anthropic) for workout generation
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
3. Check **Table Editor**. You should see `macro_profiles`, `exercises`, `workout_plans`, `plan_days` and `plan_exercises`.
4. For quick testing, go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email**, so new accounts can log in without clicking an email link.

### 4. Add your keys
Copy the example file:
```bash
cp .env.example .env.local
```
(On Windows Command Prompt: `copy .env.example .env.local`)

Fill in `.env.local`:
-