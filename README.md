# Group Fitness App

A lightweight, mobile-first web app for a group of five friends to track daily workouts. It replaces a shared spreadsheet: opening the app shows everyone's percentage of days worked out so far this year, along with one large control for logging today as "worked out" or "no workout".

---

## Features

- **Percentage tracking**: Real-time workout percentages calculated so far this year. A day only counts toward the total once it has been logged, so percentages never drop in the morning before a workout.
- **Fast daily logging**: One-tap logging for today with an optional short note (up to 200 characters).
- **History log & backfilling**: View every day from today back to January 1, filter by unlogged days, and backfill or edit past days.
- **Passcode security**: Protected by a shared group passphrase verified on the database. No passwords or email accounts required.
- **Dual modes**: Fully functional offline/demo mock mode with deterministic fake data, or live mode connected to Supabase Postgres.
- **Yearly goals**: Annual commitments (days or percent) with live on-pace status, typed passage friction for revisions, and group change logs.

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

### Testing Goals Locally

Yearly goals normally activate starting in 2027. To test the goal setup screen, goal cards, and pace tracking in 2026, add this line to your local `.env.local` file:

```env
VITE_GOALS_START_YEAR=2026
```

> [!WARNING]
> **Local only:** Never add `VITE_GOALS_START_YEAR` to Vercel's environment variables or commit it to any repository file. Any test goals created during 2026 testing can be wiped before the January 2027 launch by running `supabase/reset_goals.sql` in the Supabase SQL Editor.

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

## Goals

Starting in 2027, each member commits to one goal per year the first time they open the app that year.

- **Goal types**: Members choose either a fixed number of workout days (e.g. 180 days) or a percentage of days (e.g. 50%).
- **Pace tracking**: Every time the app opens, the Today tab shows whether the member is on track or behind pace (with days ahead or needed to catch up), calculated using pure integer arithmetic matching the percentage rules.
- **Change friction**: Goals can be updated, but doing so requires typing an excerpt from a Shakespeare sonnet with zero typos. Smart punctuation, paste, and drop are blocked in the browser. One mistake resets the passage.
- **Group visibility**: The whole group can see each member's goal and how many times it was changed. A collapsible "Goal changes" log lists the history of updates.

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

---

## Reminders

### How It Works

1. **Home Screen PWA Installation**: On iOS (16.4+), web push notifications require adding the web app to the Home Screen via Safari's Share menu ("Add to Home Screen") and opening it from the Home Screen icon.
2. **Device Push Subscription**: Tapping "Turn on reminders" in the Settings tab requests iOS notification permission and registers a Web Push subscription directly to Supabase (`push_subscriptions` table).
3. **Daily Automated Reminder**: A Vercel Cron Job triggers `/api/send-reminders` once daily at 03:00 UTC (8:00pm Arizona time). The function checks which members have not logged today and are not paused, builds a dynamic group count message, and dispatches the notification via Apple's push service with a 1-hour TTL.
4. **Pause Reminders**: Members can pause notifications through a chosen date on the Settings tab (persisted on the member's record in Supabase).

### Environment Variables

Configure these in `.env.local` (for local development) and in Vercel Project Settings (Production):

- `VITE_SUPABASE_URL`: Supabase project URL (public)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon/publishable key (public)
- `VITE_VAPID_PUBLIC_KEY`: VAPID public application server key (public)
- `VAPID_PRIVATE_KEY`: VAPID private key (secret, set only in Vercel)
- `VAPID_SUBJECT`: Contact URI, e.g. `mailto:youremail@example.com` (set in Vercel)
- `CRON_SECRET`: Random secret string (32+ characters) protecting the reminder endpoint and matched against `sender_secret_hash` in Supabase (secret, set only in Vercel)

*Never commit `.env.local` or write secret keys into the repository.*

### Testing Reminders

1. **Test notification from app**:
   In the installed app on your iPhone, go to **Settings** and tap **Send test notification**, then immediately return to the Home Screen or lock your phone. The notification should arrive within seconds. Tapping it opens the app.

2. **Forced reminder run from your computer terminal**:
   Test the reminder pipeline by triggering a forced run from your own terminal (replace `YOUR_CRON_SECRET` and `YOUR-APP.vercel.app`):
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR-APP.vercel.app/api/send-reminders?force=1"
   ```
   The response should return `{ "targeted": ..., "sent": ..., "failed": 0, "removed": 0 }` and deliver a notification with the group log count.

3. **Verify suppression when logged**:
   Log today in the app, then repeat the forced curl command. The response should show `sent: 0` because you have already logged.

4. **Verify pause suppression**:
   Clear today's log, set a pause date through today in Settings, and repeat the forced curl command. Nothing should be sent (`sent: 0`). Remember to resume reminders after testing.

5. **Verify authentication rejection**:
   Call the reminder endpoint without the Authorization header:
   ```bash
   curl -i "https://YOUR-APP.vercel.app/api/send-reminders"
   ```
   It must return HTTP `401 Unauthorized`.

