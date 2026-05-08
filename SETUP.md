# Frost Creek Friday Golf – Setup Guide

## Stack
- **Next.js** — frontend + API (hosted on Vercel)
- **Supabase** — PostgreSQL database
- **Resend** — emails
- **Twilio** — SMS texts
- **Vercel Cron** — Thursday 6:15 PM auto-notifications

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account + new project.
2. In the SQL editor, paste and run the contents of `supabase/schema.sql`.
3. In your Supabase project, go to **Settings → API** and copy the following three values. You'll paste them into two places: your local `.env.local` file (for running on your own computer) and into Vercel's environment variables (Step 4) for the live site:
   - **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` public key** → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` key** → paste as `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret — never share it)*

---

## Step 2 — Set Up Resend (Email)

1. Go to [resend.com](https://resend.com) and create a free account.
2. Add your domain (`frostcreek.com`) and follow DNS verification steps.
3. Create an API key.
4. The "from" address will be `friday@frostcreek.com` (or whatever you verify).

---

## Step 3 — Set Up Twilio (SMS)

1. Go to [twilio.com](https://twilio.com) and create an account.
2. Get a phone number (~$1/month).
3. Copy your **Account SID**, **Auth Token**, and the **from phone number**.

---

## Step 4 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and create a free account.
2. Import this project from GitHub (push the `frost-creek-friday` folder to a GitHub repo first).
3. In **Settings → Environment Variables**, add all values from `.env.local.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER`
   - `JWT_SECRET` — generate with `openssl rand -base64 32`
   - `CRON_SECRET` — generate with `openssl rand -base64 32`
4. Deploy.

---

## Step 5 — Set Up the Domain (friday.frostcreek.com)

1. In Vercel: **Settings → Domains** → add `friday.frostcreek.com`.
2. In your DNS provider (wherever frostcreek.com DNS is managed):
   - Add a `CNAME` record: `friday` → `cname.vercel-dns.com`
3. Wait a few minutes for DNS to propagate.

---

## Step 6 — Create the Admin Account

Run the seed script once to create the admin login:

```bash
cd frost-creek-friday
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed-admin.js
```

Default credentials:
- **Username:** `frostcreekadmin`
- **Password:** `ChangeMe2024!`

**Change the password** — update the `PASSWORD` constant in the script, re-run it, or do it directly in Supabase.

---

## Step 7 — Configure Cron Timezone

The cron in `vercel.json` runs at `15 0 * * 5` which is **00:15 UTC on Friday** = **6:15 PM MT Thursday** (during MDT, UTC-6). Verify this matches Mountain Time for the season:

- **MDT (summer):** UTC-6 → `15 0 * * 5` ✓
- **MST (winter):** UTC-7 → change to `15 1 * * 5`

Update `vercel.json` accordingly each season, or use a fixed UTC offset.

---

## Admin Usage

- **URL:** `https://friday.frostcreek.com/admin`
- **Dashboard:** View all signups, counts, and status
- **Generate Groups:** Click "Generate Groups" anytime after signups close at 5 PM Thursday
- **Edit Groups:** Go to Groups View to drag-and-drop players between groups
- **Send Notifications:** Click "Send Notifications Now" to send emails + texts manually, or let the cron do it at 6:15 PM automatically

---

## How Notifications Work

1. Thursday at 5:00 PM — signup deadline passes
2. Admin window 5:00–6:15 PM — generate and optionally adjust groups
3. 6:15 PM — Vercel Cron fires, generates groups (if not already done), sends emails + texts to every confirmed player
4. Each player gets their tee time, group partners, and the full schedule

---

## Grouping Algorithm

For N confirmed players:
- **N ≤ 28:** Maximize foursomes; remainder into threesomes (no fivesomes)
- **N = 29:** 6 foursomes + 1 fivesome
- **N = 30:** 5 foursomes + 2 fivesomes
- **N = 31:** Pro shop notified via email; 31st player waitlisted
- **N ≥ 32:** Players beyond 30 go on waitlist (by signup time)
- Threesomes always receive the earliest tee times (12:00 PM first)

---

## GHIN Integration (Future)

To connect to the GHIN system for live handicaps, you'll need API access from the USGA. Contact them at [usga.org/ghin](https://www.usga.org/content/usga/home-page/handicapping/ghin.html) to request API credentials. Once obtained, add a `getHandicap(ghinNumber)` call in `src/lib/notifications.ts` and display handicaps alongside player names.
