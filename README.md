# Group Fitness App

A lightweight, mobile-first web app for a group of five friends to track daily workouts. It replaces a shared spreadsheet: opening the app shows everyone's percentage of days worked out so far this year, along with one large control for logging today as "worked out" or "no workout".

---

## Features

- **Percentage tracking**: Real-time workout percentages calculated so far this year. A day only counts toward the total once it has been logged, so percentages never drop in the morning before a workout.
- **Fast daily logging**: One-tap logging for today with an optional short note (up to 200 characters).
- **History log & backfilling**: View every day from today back to January 1, filter by unlogged days, and backfill or edit past days.
- **Passcode security**: Protected by a shared group passphrase verified on the database. No passwords or email accounts required.
- **Dual modes**: Fully functional offline/demo mock mode with deterministic fake data, or live mode connected to Supabase Postgres.

---

## Local Development

### Prerequisites

- Node.js 20.19 or newer
- npm

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd group-fitness-app
npm install
```

### Running in Mock Mode (Demo)

Mock mode runs entirely in memory with simulated data for 5 members (`Audrey`, `Gray`, `Jack`, `Jackie`, `Jan`). Nothing is saved to a server.

To run in mock mode:
```bash
npm run dev
```
*(If `.env.local` is present, you can force mock mode by running: `VITE_USE_MOCK=true npm run dev`)*

- **Passcode**: `test`

### Running in Real Mode (Connected to Supabase)

Ensure you have your `.env.local` file configured in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Then start the local development server:

```bash
npm run dev
```

- **Passcode**: Enter your group's private passphrase.

### Running Unit Tests & Verification

Run the automated test suite with Vitest:

```bash
npm test
```

Verify production build and TypeScript strict types:

```bash
npm run build
```

---

## Backend Setup (Supabase)

1. **Create a project**: Sign up for free at [supabase.com](https://supabase.com) and create a project in the region closest to your group.
2. **Execute schema and seed scripts**:
   - In the Supabase dashboard, open the **SQL Editor**.
   - Copy and run `supabase/schema.sql` to establish tables, Row Level Security (RLS) locks, and secure RPC functions.
   - Review names in `supabase/seed.sql` and run it to create member entries.
   - *(Optional)* Run `supabase/dev_seed_logs.sql` if you want test logs generated for Sept/Oct 2026.
3. **Set the group passphrase**:
   In the SQL Editor, execute:
   ```sql
   insert into public.group_settings (id, passcode_hash)
   values (1, extensions.crypt('PUT YOUR PASSPHRASE HERE', extensions.gen_salt('bf')))
   on conflict (id) do update set passcode_hash = excluded.passcode_hash;
   ```
4. **Configure environment keys**:
   - In **Project Settings** > **API**, copy the **Project URL** and the public key (**anon** / **publishable**).
   - Add them to `.env.local` (never use or commit the `service_role` key).
5. **Launch wipe**:
   - Before launching in January 2027, run `supabase/reset_logs.sql` in the SQL Editor to wipe test data.

---

## Deployment to Vercel

The app is built as a static client with no server-side Node processes. It deploys directly to [Vercel](https://vercel.com).

### Step-by-Step Deployment Checklist

1. **Push your code to GitHub**:
   Ensure all changes are committed and pushed to your GitHub repository.
2. **Import into Vercel**:
   - Log in to your Vercel account and click **"Add New..."** > **"Project"**.
   - Select your `group-fitness-app` repository and click **Import**.
3. **Select Framework Preset**:
   - Framework preset should automatically detect as **Vite** (Build command: `npm run build`, Output directory: `dist`).
4. **Add Environment Variables**:
   Under **Environment Variables**, add the two production keys from your Supabase dashboard:
   - `VITE_SUPABASE_URL`: your Supabase Project URL (`https://your-project.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: your Supabase public anon key
5. **Deploy**:
   - Click **Deploy**.
   - Once deployment completes, open the provided URL on your phone or computer.
   - Enter your group passphrase, choose your name, and verify the live connection!
