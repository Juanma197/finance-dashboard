# Wealth OS – Supabase setup and deployment

This guide explains how to set up Supabase for cloud sync and authentication, configure environment variables, and deploy to Vercel.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project**.
3. Fill in:
   - **Name**: `wealth-os` (or any name)
   - **Database Password**: choose a strong password
   - **Region**: select the closest region
4. Click **Create new project** and wait for it to provision.

## 2. Configure Authentication

1. In the Supabase dashboard, open **Authentication** → **Providers**.
2. Ensure **Email** is enabled.
3. Optional: under **Authentication** → **URL Configuration**, set:
   - **Site URL**: `https://your-app.vercel.app` (after deployment)
   - **Redirect URLs**: `https://your-app.vercel.app/**` for redirects after email confirmation

## 3. Run the database schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Create a new query and paste the contents of `supabase-schema.sql`.
3. Run the query. It will create all tables and RLS policies.

If you already ran an older schema and need to add `WITH CHECK` to RLS policies, run a migration: drop each policy and recreate it with `with check (auth.uid() = user_id)`.

## 4. Get your API keys

1. In the Supabase dashboard, open **Project Settings** (gear icon) → **API**.
2. Copy:
   - **Project URL**
   - **anon public** key (under Project API keys)

## 5. Configure the app

### Option A: Edit `config.js` (local or static deploy)

Edit `config.js` and set:

```js
window.WEALTH_OS_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "your-anon-key-here",
};
```

Before the script runs, you can also set:

```html
<script>
  window.WEALTH_OS_CONFIG = {
    supabaseUrl: "https://xxx.supabase.co",
    supabaseAnonKey: "your-anon-key",
  };
</script>
<script src="config.js"></script>
```

### Option B: Vercel environment variables

1. In your Vercel project: **Settings** → **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

3. Update `config.js` to read from Vercel’s injected env:

```js
(function () {
  const url = typeof window !== "undefined" && window.__ENV__?.VITE_SUPABASE_URL
    ? window.__ENV__.VITE_SUPABASE_URL
    : "";
  const key = typeof window !== "undefined" && window.__ENV__?.VITE_SUPABASE_ANON_KEY
    ? window.__ENV__.VITE_SUPABASE_ANON_KEY
    : "";
  window.WEALTH_OS_CONFIG = {
    supabaseUrl: url,
    supabaseAnonKey: key,
  };
})();
```

Or use a build step that replaces placeholders in `config.js` with env values.

## 6. Deploy to Vercel

### Basic deploy (static)

1. Push your repo to GitHub.
2. In [vercel.com](https://vercel.com): **New Project** → import the repo.
3. **Framework Preset**: Other (static)
4. **Build Command**: leave empty (or `echo "build"` if required)
5. **Output Directory**: `.` (root)
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as env vars.
7. Deploy.

### Optional: inject env at build time

Create `vercel.json`:

```json
{
  "buildCommand": "node scripts/inject-env.js",
  "outputDirectory": ".",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Create `scripts/inject-env.js` (or use the one included in the repo) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel. The script injects these into `config.js` at build time.

Then set your env vars in Vercel and redeploy.

## 7. Local-only mode

If `config.js` does not set `supabaseUrl` and `supabaseAnonKey`, the app runs in local-only mode:

- No login screen
- Data stored in `localStorage` only
- All existing features work as before

## 8. Security

- The **anon** key is public and safe to expose in the browser.
- Row Level Security (RLS) ensures users only access their own rows.
- Use **service_role** only in secure server-side code.
- Never commit the service_role key or any secrets.
