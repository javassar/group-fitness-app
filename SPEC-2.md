# Group Fitness App: Stage 2 Spec (home-screen install and reminders)

This spec continues `SPEC.md`. Everything in `SPEC.md` still applies unless this file says otherwise. This file covers Milestones 5 to 7. Read the section for the current milestone before starting it.

## 1. Summary

Stage 1 produced a working, deployed tracker. Stage 2 makes it installable on an iPhone Home Screen and adds one daily reminder notification.

The reminder rules:

- Each member can turn reminders on for a device.
- Around 8pm Arizona time, every member who has NOT logged that day (neither "worked out" nor "no workout") and has not paused reminders gets one notification.
- The notification says how many people have logged so far.
- Each member can pause reminders through a chosen date.

Goals are still out of scope and come in a later stage.

## 2. Design decisions for this stage

- **Platform:** every user has an iPhone, so the build targets iOS web push. On iPhone, notifications work only for an app added to the Home Screen and opened from there (iOS 16.4 or newer). Each person must tap a button inside the installed app to grant permission.
- **Time zone:** everyone is in Arizona, which has no daylight saving time, so 8pm is always 03:00 UTC. That allows a once-a-day scheduler. Vercel's free plan supports once-a-day cron jobs, and the run may start anywhere inside the scheduled hour, so reminders arrive between 8:00pm and 8:59pm.
- **Scheduler:** one Vercel cron job calls a Vercel function that sends the notifications. No new hosting service is needed.
- **No privileged database key:** the sender function uses the same public key as the app. It reaches the data through SQL functions that require a separate sender secret (same pattern as the group passcode). The `service_role` key is still never used.
- **Limit to remember:** if someone outside Arizona joins, a once-a-day job will send at the wrong local time for that person. That would need an hourly scheduler.

## 3. Stack additions

Allowed new dependencies, and nothing else without asking:

- `web-push` (runtime dependency, used by the functions in `api/`)
- `@types/web-push`, `@vercel/node` (types only), `@types/node` if the template lacks it, and `sharp` (dev dependencies; `sharp` is only for generating icons)

Other rules:

- Functions in `api/` run only on Vercel. They cannot run under `npm run dev`. Do not install the Vercel CLI and do not run `vercel dev`.
- Because `package.json` uses `"type": "module"`, write relative imports inside `api/` with a `.js` extension even though the files are `.ts` (for example `import { buildReminderMessage } from './_lib/message.js'`). If a Vercel log reports a module-not-found error, check the import extensions first.
- Add `"api"` to the `include` list in `tsconfig.node.json` so `npm run build` type-checks the functions. If this causes errors you cannot resolve, report them instead of removing type checks.

## 4. Rules and definitions

### 4.1 What counts as "logged"

A member has logged today if a `day_logs` row exists for their local today, with either status. A "no workout" log stops the reminder.

### 4.2 Who gets a reminder

A device subscription is targeted when ALL of these hold for its member:

1. The member has no log row for their local today.
2. The member is not paused: `reminders_paused_until` is null or earlier than their local today. A pause "through" a date includes that whole day and ends the day after.
3. The member's local hour is 20 or later (checked in SQL, using the member's stored time zone).
4. The member has not already been reminded today (`last_reminded_on` is not today's local date).

A manual test run with `force=1` skips rules 3 and 4, and does not record that a reminder was sent.

### 4.3 Message text

Implement as the pure function `buildReminderMessage(loggedCount, memberCount)` in `api/_lib/message.ts`, returning `{ title, body }`. The title is always `Group Fitness`. The body is:

- `Nobody has logged today yet. Log yours.` when `loggedCount` is 0
- `Everyone else has logged today. Log yours.` when `loggedCount >= memberCount - 1`
- otherwise `{loggedCount} of {memberCount} have logged today. Log yours.`

The checks apply in that order. The wording is intentionally neutral so a "no workout" log feels as acceptable as a workout.

### 4.4 Notification delivery

- Send with a TTL of 3600 seconds so a late reminder does not arrive hours after the fact.
- Every push must show a visible notification. iOS revokes subscriptions that receive pushes without one. The service worker (Appendix B) always calls `showNotification`.
- If the push service answers 404 or 410 for a subscription, that subscription is dead. Delete it through `delete_dead_subscriptions`.
- Tapping a notification opens the app (focuses an existing window or opens `/`).

### 4.5 Secrets

- `VAPID_PRIVATE_KEY` and `CRON_SECRET` exist only in Vercel's environment settings, set by Jackie. They never appear in any file, log output, test, prompt, or commit.
- `VITE_VAPID_PUBLIC_KEY` is public by design and may appear in `.env.local` and in the built page.
- `CRON_SECRET` has two uses. Vercel sends it to the cron endpoint as `Authorization: Bearer <value>`, and the function passes the same value to the SQL sender functions, which compare it with a hash stored in the database.
- Never log or return endpoint URLs or subscription keys. Log counts only.

### 4.6 Browser storage

In addition to the keys in `SPEC.md` section 4.6, use one more key: `gfa.installHintDismissed`.

## 5. Screens

### 5.1 Install hint (Today tab)

Shown at the top of the Today tab when the device is an iPhone or iPad, the app is NOT running as an installed Home Screen app, and the hint has not been dismissed. Text: "Add this app to your Home Screen to get reminders. In Safari, open the Share menu and choose Add to Home Screen. Menu names can vary slightly by iOS version." A "Dismiss" button stores `gfa.installHintDismissed = '1'`.

### 5.2 Settings tab

Add a third tab named Settings. The tab bar bottom padding includes `env(safe-area-inset-bottom)` so the iPhone home indicator does not overlap it.

**Reminders on this device** (one state at a time):

| State | What shows |
| --- | --- |
| `needs_install` | "Reminders need the app on your Home Screen. In Safari, open the Share menu, choose Add to Home Screen, then open the app from your Home Screen and turn reminders on there. The installed app asks for the passcode and your name again." |
| `unsupported` | "This browser does not support reminders." |
| `blocked` | "Notifications are blocked for this app. Open the iPhone Settings app, find this app under Notifications, and allow them." |
| `off` | A "Turn on reminders" button |
| `on` | "Reminders are on for this device." with two buttons: "Send test notification" and "Turn off reminders" |

Below the state, always show: "You get one reminder around 8pm on days you have not logged."

**Pause reminders** (applies to all of the member's devices):

- If a pause is active (`pausedUntil` is on or after today): show "Paused through {date}" and a "Resume now" button.
- Otherwise: a date input labeled "Pause reminders through" (minimum is today) and a "Pause" button, disabled until a date is chosen.

In mock (demo) mode, the whole reminders area shows "Reminders are not available in demo mode."

### 5.3 Behavior details

- Turning on reminders must start from a button tap, because iOS requires a user gesture for the permission prompt.
- When the app opens and notification permission is already granted, check `pushManager.getSubscription()`. If a subscription exists, silently save it again (the save is an upsert, so no duplicates). If it does not exist, show the `off` state.
- "Not you?" removes this device's subscription (browser and database) before clearing the member id.
- Error messages are plain text with a retry path, as in `SPEC.md` section 5.7.

## 6. Code structure additions

```
api/
  _lib/
    message.ts
    message.test.ts
    push.ts
    supabase.ts
  send-reminders.ts
  send-test.ts
public/
  sw.js
  manifest.webmanifest
  icons/
    source.svg          (placeholder, used only if source.png is absent)
    icon-192.png
    icon-512.png
    icon-512-maskable.png
    apple-touch-icon.png
scripts/
  make-icons.mjs
src/
  lib/
    platform.ts         (isIOS, isStandalone, isPushSupported)
    push.ts             (subscribe, unsubscribe, urlBase64ToUint8Array, sendTestNotification)
    reminderState.ts    (getReminderUiState)
    *.test.ts           (tests for the three files above)
  screens/
    SettingsScreen.tsx
  components/
    InstallHint.tsx
    RemindersCard.tsx
    PauseCard.tsx
supabase/
  reminders.sql
vercel.json
```

### 6.1 DataClient additions

Add to the `DataClient` interface in `src/data/types.ts`. The mock client implements them as in-memory no-ops.

```ts
savePushSubscription(memberId: string, sub: { endpoint: string; p256dh: string; auth: string }): Promise<void>;
removePushSubscription(endpoint: string): Promise<void>;
getReminderSettings(memberId: string): Promise<{ pausedUntil: string | null }>;
setRemindersPausedUntil(memberId: string, date: string | null): Promise<void>;
```

The Supabase client maps these to `save_push_subscription`, `remove_push_subscription`, `get_reminder_settings`, and `set_reminders_paused_until` in Appendix A. Parameter names match the SQL.

### 6.2 Vercel functions

**`api/send-reminders.ts`** (GET)

1. Reject with 401 unless the `Authorization` header equals `Bearer ` plus `CRON_SECRET`.
2. `force` is true when the query contains `force=1`.
3. Call RPC `get_reminder_targets` with `{ p_secret, p_force }`.
4. For each target row, build the message with `buildReminderMessage(logged_count, member_count)` and send to that row's subscription.
5. Send in parallel (`Promise.allSettled`). Classify each result as sent, gone (404 or 410), or failed.
6. Unless `force` is true, call `mark_reminded` for every member with at least one sent notification.
7. Call `delete_dead_subscriptions` for gone endpoints.
8. Respond with JSON counts only: `{ targeted, sent, failed, removed }`.

**`api/send-test.ts`** (POST, JSON body `{ passcode, memberId }`)

1. Reject non-POST requests with 405 and malformed bodies with 400.
2. Verify the passcode with RPC `check_passcode` and reply 401 if false.
3. Fetch the member's subscriptions with RPC `get_member_subscriptions` using `CRON_SECRET` as `p_secret`. Reply 404 with a short message if none exist.
4. Send the payload `{ title: 'Group Fitness', body: 'Test notification. Reminders are working.', tag: 'test' }` to each, delete dead subscriptions, and respond `{ sent, failed }`.

Shared code lives in `api/_lib/` (the underscore keeps those files from becoming routes). The Supabase client there is created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `process.env`, with the same auth options as the browser client. Configure `web-push` with `VAPID_SUBJECT`, `VITE_VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`. Reminder payloads use `tag: 'daily-reminder'`.

### 6.3 Cron and headers (`vercel.json`)

Add the cron entry in Milestone 7 only, after the function exists:

```json
{
  "crons": [{ "path": "/api/send-reminders", "schedule": "0 3 * * *" }],
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

Vercel cron schedules are in UTC. `0 3 * * *` is 8:00pm in Arizona all year. The `headers` block is added in Milestone 5, and `crons` is added in Milestone 7.

## 7. Unit tests (Vitest)

- `api/_lib/message.test.ts`: (0, 5) gives the "Nobody" text; (2, 5) gives "2 of 5 have logged today. Log yours."; (4, 5) gives the "Everyone else" text; (0, 1) gives the "Nobody" text.
- `src/lib/reminderState.test.ts`: `getReminderUiState({ supported, isIOS, isStandalone, permission, hasSubscription })` returns `needs_install` when iOS and not standalone (even if unsupported); otherwise `unsupported` when not supported; otherwise `blocked` when permission is `denied`; otherwise `on` when permission is `granted` and a subscription exists; otherwise `off`. Cover each branch.
- `src/lib/push.test.ts`: `urlBase64ToUint8Array` converts a known short base64url string to the expected bytes, including a string that needs padding and one containing `-` and `_`.

## 8. Milestones

Stop after each milestone and write the milestone report from `GEMINI.md`. Jackie pushes to GitHub herself. Vercel then deploys, and she tests on her iPhone.

### Milestone 5: install on the Home Screen

1. Append the block in Appendix C to `GEMINI.md`.
2. Install `sharp`. Write `scripts/make-icons.mjs` and an npm script `icons`. The script reads `public/icons/source.png` if it exists, otherwise `public/icons/source.svg`. Create the placeholder `source.svg` first: a solid square in the app's accent color with a white check mark. The script outputs `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (artwork inside the central 80 percent), and `apple-touch-icon.png` (180 by 180, fully opaque). Run it once and keep the generated PNGs in the repository.
3. Write `public/manifest.webmanifest`: name "Group Fitness", short name "Fitness", `start_url` and `scope` of `/`, `display` of `standalone`, `background_color` and `theme_color` taken from `styles.css`, and the icons above.
4. In `index.html`, link the manifest and the apple touch icon, and add `theme-color`, `apple-mobile-web-app-capable`, and `apple-mobile-web-app-title` tags. Make sure the viewport tag includes `viewport-fit=cover`.
5. Write `public/sw.js` exactly as in Appendix B. Register it in `src/main.tsx` only in production builds (`import.meta.env.PROD`).
6. Create `vercel.json` with the `headers` block only.
7. Write `src/lib/platform.ts`, `InstallHint.tsx`, and a Settings tab that for now shows only the install explanation from section 5.2. Update the tab bar to three tabs with bottom safe-area padding.

Done when:

- `npm run build` and `npm test` pass.
- After Jackie pushes and Vercel deploys, on her iPhone: Safari shows the install hint, which can be dismissed; Add to Home Screen produces an icon with the right name; the app opens full screen without Safari's toolbars; the installed app asks for the passcode and name again (iOS storage is separate from Safari) and then works normally; the install hint does not appear inside the installed app.

### Milestone 6: subscriptions, settings, and pause

1. Write `supabase/reminders.sql` from Appendix A exactly.
2. Write the data layer additions (section 6.1), `src/lib/push.ts`, `src/lib/reminderState.ts`, `RemindersCard.tsx`, `PauseCard.tsx`, the full Settings tab, and the tests from section 7 for those files.
3. Make "Not you?" unsubscribe this device first (section 5.3).
4. Print the human steps for this milestone (section 9, steps 2 to 4) and stop. Wait until Jackie confirms she finished them.

Done when, in the installed app on Jackie's iPhone:

- "Turn on reminders" shows the iOS permission prompt, and accepting it changes the state to `on`.
- The Supabase Table Editor shows one row in `push_subscriptions` for her member.
- Reopening the app with reminders on does not create a second row.
- "Turn off reminders" removes the row. "Not you?" also removes it.
- A pause date can be set, survives closing and reopening the app, and can be resumed.
- Denying the permission prompt shows the `blocked` message.

### Milestone 7: sending and scheduling

1. Install `web-push` and the type packages. Write everything in `api/` (section 6.2), the message tests, and the "Send test notification" button on the Settings tab (it calls `sendTestNotification`, which POSTs to `/api/send-test` and shows "Sent. It should arrive in a few seconds." or the error).
2. Add the `crons` entry to `vercel.json`.
3. Update `README.md` with a "Reminders" section: how it works, the list of environment variables by name (never values), and the test commands below.
4. Print the human steps for this milestone (section 9, steps 5 and 6) and stop until Jackie confirms.

Test sequence (Jackie runs it, the agent helps interpret results):

1. In the installed app, tap "Send test notification", then immediately return to the Home Screen or lock the phone, since foreground behavior varies. The notification should arrive. Tapping it opens the app.
2. Trigger a forced reminder run from her computer, with her `CRON_SECRET` typed into her own terminal and not shared with the agent: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR-APP.vercel.app/api/send-reminders?force=1"`. The response shows `sent` of at least 1 and a reminder arrives with the group-count text.
3. Log today in the app, then repeat the forced run. Nothing should be sent.
4. Clear today's log, set a pause through today, then repeat the forced run. Nothing should be sent. Resume the reminders.
5. Call the endpoint without the header. It must return 401.
6. Leave reminders on and today unlogged. Check that one reminder arrives between 8:00pm and 8:59pm Arizona time, and check the function logs in Vercel (Cron Jobs and Logs sections) if it does not.
7. Over the next three evenings, confirm: one reminder when unlogged, none when logged, none when paused.

Done when steps 1 to 5 pass and the first scheduled reminder has arrived. Steps 6 and 7 may be completed after the milestone is committed.

## 9. Human tasks (the agent cannot do these)

1. **Icon (optional, before Milestone 5).** If you have an app icon, save it as `public/icons/source.png`: square, at least 1024 pixels, no transparent areas. Without one, a placeholder is generated.
2. **Generate push keys (start of Milestone 6).** In your own terminal, run `npx web-push generate-vapid-keys` and accept the prompt to download the package. It prints a public key and a private key. Save both in a password manager. Do not paste the private key into any chat, file, or prompt.
3. **Public key setup.** Add `VITE_VAPID_PUBLIC_KEY=<public key>` to `.env.local` and to Vercel's environment variables (Production). Then redeploy, because `VITE_` variables are baked in at build time.
4. **Run the reminders SQL.** In the Supabase SQL Editor, run `supabase/reminders.sql`.
5. **Create the sender secret (start of Milestone 7).** Choose a long random string of at least 32 characters (a password manager's generator works). In Vercel's environment variables (Production), add `CRON_SECRET` set to that string, `VAPID_PRIVATE_KEY` set to the private key from step 2, and `VAPID_SUBJECT` set to `mailto:` followed by your email address. Do not save any of these in a file in the repository.
6. **Store the secret's hash in the database.** In the Supabase SQL Editor, run this with the same string as `CRON_SECRET`. Run it directly in the editor and do not save it anywhere in the repository. Then redeploy on Vercel so the new variables load.

   ```sql
   update public.group_settings
   set sender_secret_hash = extensions.crypt('PUT YOUR CRON_SECRET VALUE HERE', extensions.gen_salt('bf'))
   where id = 1;
   ```

## 10. Security rules

- The new table has row level security enabled with no policies. The public key cannot read or write it directly.
- Subscriptions are saved and removed only through functions that check the passcode. Sender functions work only with the sender secret.
- The reminder endpoint rejects requests without the correct `CRON_SECRET`. The test endpoint requires the group passcode.
- Anyone with the passcode can send a test notification to any member. This matches the existing trust model.

---

## Appendix A: SQL

Create this file exactly as written. Run it once after `schema.sql`.

### supabase/reminders.sql

```sql
-- Stage 2: reminders. Run once in the Supabase SQL Editor, after schema.sql.

alter table public.members
  add column if not exists reminders_paused_until date,
  add column if not exists last_reminded_on date;

alter table public.group_settings
  add column if not exists sender_secret_hash text;

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  p256dh_key text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Internal helper: checks the secret used by the Vercel sender functions.
create or replace function public.assert_sender_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from group_settings
    where sender_secret_hash is not null
      and sender_secret_hash = crypt(coalesce(p_secret, ''), sender_secret_hash)
  ) then
    raise exception 'invalid sender secret' using errcode = '28000';
  end if;
end;
$$;

-- App-facing functions (group passcode).

create or replace function public.save_push_subscription(
  p_passcode text, p_member_id uuid, p_endpoint text, p_p256dh_key text, p_auth_key text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  if not exists (select 1 from members where id = p_member_id) then
    raise exception 'unknown member';
  end if;
  insert into push_subscriptions (endpoint, member_id, p256dh_key, auth_key)
  values (p_endpoint, p_member_id, p_p256dh_key, p_auth_key)
  on conflict (endpoint) do update
    set member_id = excluded.member_id,
        p256dh_key = excluded.p256dh_key,
        auth_key = excluded.auth_key;
end;
$$;

create or replace function public.remove_push_subscription(
  p_passcode text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  delete from push_subscriptions where endpoint = p_endpoint;
end;
$$;

create or replace function public.get_reminder_settings(
  p_passcode text, p_member_id uuid)
returns table (paused_until date)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select m.reminders_paused_until
    from members m
    where m.id = p_member_id;
end;
$$;

create or replace function public.set_reminders_paused_until(
  p_passcode text, p_member_id uuid, p_paused_until date)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_today date;
begin
  perform assert_passcode(p_passcode);
  select (now() at time zone m.time_zone)::date
    into v_today
    from members m
    where m.id = p_member_id;
  if v_today is null then
    raise exception 'unknown member';
  end if;
  if p_paused_until is not null and p_paused_until < v_today then
    raise exception 'pause date is in the past';
  end if;
  update members
    set reminders_paused_until = p_paused_until
    where id = p_member_id;
end;
$$;

-- Sender functions (sender secret). Used only by the Vercel functions.

create or replace function public.get_reminder_targets(
  p_secret text, p_force boolean default false)
returns table (
  member_id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text,
  logged_count int,
  member_count int
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  return query
    select
      m.id,
      s.endpoint,
      s.p256dh_key,
      s.auth_key,
      (select count(*)::int from day_logs l where l.log_date = t.local_today),
      (select count(*)::int from members)
    from members m
    join push_subscriptions s on s.member_id = m.id
    cross join lateral (
      select
        (now() at time zone m.time_zone)::date as local_today,
        extract(hour from (now() at time zone m.time_zone))::int as local_hour
    ) t
    where not exists (
            select 1 from day_logs l
            where l.member_id = m.id and l.log_date = t.local_today
          )
      and (m.reminders_paused_until is null or m.reminders_paused_until < t.local_today)
      and (
            p_force
            or (
              t.local_hour >= 20
              and (m.last_reminded_on is null or m.last_reminded_on < t.local_today)
            )
          );
end;
$$;

create or replace function public.mark_reminded(p_secret text, p_member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  update members as m
    set last_reminded_on = (now() at time zone m.time_zone)::date
    where m.id = any (p_member_ids);
end;
$$;

create or replace function public.delete_dead_subscriptions(
  p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  delete from push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

create or replace function public.get_member_subscriptions(
  p_secret text, p_member_id uuid)
returns table (endpoint text, p256dh_key text, auth_key text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  return query
    select s.endpoint, s.p256dh_key, s.auth_key
    from push_subscriptions s
    where s.member_id = p_member_id;
end;
$$;

revoke all on function public.assert_sender_secret(text) from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, uuid, text, text, text) to anon;
grant execute on function public.remove_push_subscription(text, text) to anon;
grant execute on function public.get_reminder_settings(text, uuid) to anon;
grant execute on function public.set_reminders_paused_until(text, uuid, date) to anon;
grant execute on function public.get_reminder_targets(text, boolean) to anon;
grant execute on function public.mark_reminded(text, uuid[]) to anon;
grant execute on function public.delete_dead_subscriptions(text, text[]) to anon;
grant execute on function public.get_member_subscriptions(text, uuid) to anon;
```

## Appendix B: service worker

Create `public/sw.js` exactly as written. It has no caching and no fetch handler on purpose, so the app never serves stale files.

```js
// Group Fitness service worker. Handles push notifications only.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || 'Group Fitness';
  const options = {
    body: data.body || 'Time to log your day.',
    icon: '/icons/icon-192.png',
    tag: data.tag || 'gfa'
  };
  // iOS requires every push to show a notification.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow('/');
    })()
  );
});
```

## Appendix C: additions to GEMINI.md

Append this block to the end of `GEMINI.md` in Milestone 5, step 1.

```
## Additions for SPEC-2.md (milestones 5 to 7)

- The build spec for milestones 5 to 7 is SPEC-2.md. SPEC.md still applies to everything it covers. Allowed dependencies are those in SPEC.md section 3 plus SPEC-2.md section 3.
- Never write VAPID_PRIVATE_KEY, CRON_SECRET, or any other secret value into any file, log, test, or commit. They live only in Vercel's environment settings, which Jackie sets herself. Do not ask her to paste them to you.
- Files in api/ run only on Vercel. Do not install the Vercel CLI or run vercel dev. Verify with npm run build and npm test, and ask Jackie to test the deployed site on her iPhone.
- Jackie pushes to GitHub herself. After each push Vercel deploys. Ask her to report what she sees on her phone, and to paste Vercel log output (with secrets removed) if something fails.
```
