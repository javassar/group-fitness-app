# group-fitness-app

Fitness tracker web app for a group of friends to track daily workouts.

## Backend setup

Follow these steps in your Supabase project dashboard to connect the backend:

1. **Create Supabase project**: Create a free account at [supabase.com](https://supabase.com) and start a new project. Choose the region closest to your group.
2. **Execute schema and seed scripts**:
   - In your Supabase dashboard, navigate to the **SQL Editor**.
   - Review names in `supabase/seed.sql` (default: Jan, Jack, Audrey, Gray, Jackie).
   - Paste and run `supabase/schema.sql`.
   - Paste and run `supabase/seed.sql`.
   - *(Optional)* Run `supabase/dev_seed_logs.sql` if you want test logs generated for September and October 2026.
3. **Set the group passcode**:
   - In the SQL Editor, run the following query replacing `'PUT YOUR PASSPHRASE HERE'` with your chosen group passphrase (do not commit or save this phrase in any file in the repository):
     ```sql
     insert into public.group_settings (id, passcode_hash)
     values (1, extensions.crypt('PUT YOUR PASSPHRASE HERE', extensions.gen_salt('bf')))
     on conflict (id) do update set passcode_hash = excluded.passcode_hash;
     ```
4. **Configure environment keys**:
   - In your Supabase dashboard, go to **Project Settings** > **API** (or **API Keys**).
   - Copy the **Project URL** and the public key (labeled **anon** or **publishable**). *Never use the secret or service_role key.*
   - In your local project root, create a file named `.env.local` (this file is ignored by git):
     ```
     VITE_SUPABASE_URL=paste_your_project_url_here
     VITE_SUPABASE_ANON_KEY=paste_your_anon_key_here
     ```
5. **Launch preparation**:
   - Before launch in January 2027, run `supabase/reset_logs.sql` in the SQL Editor to purge test logs.
