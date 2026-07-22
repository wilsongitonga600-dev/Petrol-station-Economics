# Shift Reconciliation — Multi-User Architecture

## Summary of the change

The original tool is a single HTML file with `localStorage`. That's correct for
"one attendant, one device, works offline." It cannot be adapted into a secure
multi-user system by adding more JavaScript — real authentication and
role-based access control require a server that can verify identity and
enforce permissions independent of the client.

## Recommended stack

**Supabase** (hosted Postgres + Auth + Row-Level Security), with the frontend
staying as plain HTML/JS pages (no build step required — matches the spirit of
the original tool).

Why this over a custom Node/Express backend:
- No server to host, patch, or pay for — Supabase's free tier covers this scale
- Row-Level Security enforces permissions **in the database**, not just in the
  UI — so even a modified/malicious client request can't read another
  attendant's rows
- Built-in email/password auth with session persistence, so "remember me" and
  session handling come for free instead of being hand-rolled (a common source
  of security bugs)

If you'd rather self-host, the same schema and RLS logic ports directly to any
Postgres + a backend framework — Supabase just removes the "build and secure
your own auth server" work.

## Key correction to the original spec

> "Admin can... manage attendant accounts"

Creating a user account requires a privileged (`service_role`) key. That key
must **never** ship to the browser — anyone could extract it from page source
and create/delete arbitrary accounts. Admin account creation has to go through
a small server-side function (a Supabase Edge Function, included in
`supabase/functions/create-attendant/`). The admin dashboard calls that
function; the function is the only thing holding the privileged key.

## Database schema

- `profiles` — one row per user (extends Supabase's built-in `auth.users`),
  holds `role` ('attendant' | 'admin'), `full_name`, `active` flag
- `shift_reconciliations` — one row per saved shift, `user_id` foreign key
  links it to the attendant who created it; fuel/money data stored as `jsonb`
  so the existing nozzle/payment structure ports over with minimal change
- `activity_logs` — optional audit trail (login, create, edit, delete events)

RLS policies (in `schema.sql`):
- Attendants: full CRUD on rows where `user_id = auth.uid()`, nothing else
- Admins: read access to everything; write access scoped to what the UI
  exposes (e.g. deactivating an attendant, not editing their shifts)

## Auth flow

1. `login.html` — email + password, "remember me" toggle (maps to Supabase's
   session persistence option)
2. On success, fetch the user's `profiles` row to get their `role`
3. Redirect: `attendant` → `attendant-dashboard.html`, `admin` →
   `admin-dashboard.html`
4. Every protected page runs `auth-guard.js` on load: no session → redirect to
   login; wrong role for this page → redirect to their correct dashboard
   (this stops direct URL access to pages a role shouldn't see)

## What's included vs. what's next

**Included in this pass:**
- Full schema + RLS policies (`schema.sql`)
- Login page with role-based redirect (`login.html`)
- Shared auth guard + Supabase client config (`auth-guard.js`, `supabase-client.js`)
- Attendant dashboard shell — welcome message, monthly stats, recent shifts,
  shortage/excess summary, all live-querying Supabase (`attendant-dashboard.html`)
- Admin dashboard shell — station-wide stats, recent reconciliations across all
  attendants, top shortages (`admin-dashboard.html`)
- Admin user management page — list/deactivate attendants, invite new ones via
  the Edge Function (`admin-users.html`)
- The Edge Function for secure account creation (`supabase/functions/create-attendant/`)

**Natural next step:** port the existing reconciliation *form* (meter
readings, nozzles, money fields, save/edit logic) from `reconciliation.html`
into the attendant dashboard, swapping `localStorage` calls for the
`saveShift()` / `loadMyShifts()` functions already stubbed in
`shift-data.js`. Worth doing as its own pass once login/RBAC are confirmed
working end-to-end.

**Later scalability** (pump assignments, tank dips, deliveries, multi-branch,
offline sync, Android packaging): the schema already anticipates this — every
table is designed so a `station_id` column can be added later without
restructuring what exists now. Offline-first sync in particular is a
substantial separate project (conflict resolution, queued writes) — worth
scoping on its own once the core system is in daily use.
