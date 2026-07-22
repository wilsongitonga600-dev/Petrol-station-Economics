# Setup Guide

## 1. Create a Supabase project
1. Go to supabase.com → New project (free tier is fine to start)
2. Wait for it to finish provisioning (~2 minutes)

## 2. Run the schema
1. In your Supabase project → SQL Editor → New query
2. Paste the entire contents of `schema.sql` → Run

## 3. Create your first admin
1. Dashboard → Authentication → Users → Add user
   - Enter your email + a password, check "Auto Confirm User"
2. Back in SQL Editor, run:
   ```sql
   update public.profiles set role = 'admin' where email = 'your-admin@email.com';
   ```

## 4. Get your API keys
1. Dashboard → Project Settings → API
2. Copy the **Project URL** and the **anon / public** key
3. Paste both into `supabase-client.js` (replace the placeholder values)

## 5. Deploy the Edge Function (for admin-created accounts)
Requires the Supabase CLI (`npm install -g supabase`):
```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy create-attendant
```
The function automatically has access to your project's `service_role` key —
you don't need to set that yourself.

## 6. Host the frontend
These are static files — any static host works: Netlify, Vercel, GitHub
Pages, or even Supabase's own storage. Upload all the `.html` and `.js`
files together (they reference each other by relative filename).

## 7. Try it
1. Open `login.html`, sign in as your admin
2. Go to **Manage attendants** → create your first attendant account
3. Log out, sign in as that attendant → should land on the attendant
   dashboard and see nothing from other accounts

## Next: wire in the reconciliation form
`reconciliation.html` (your existing tool) still uses `localStorage`. The
functions in `shift-data.js` (`saveShiftToServer`, `loadMyShifts`,
`deleteShiftFromServer`) are ready to swap in wherever that file currently
calls `localStorage.setItem` / `getItem`. Once that's done, attendants save
directly to their own rows in Supabase instead of the browser's local
storage, and everything else (dashboards, admin reports) will reflect it
automatically.
