# Setup and deployment

## Local development

1. Install Node.js 20.19+ and npm.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Create a Supabase project, enable email/password auth, set local and deployed redirect URLs, and apply `supabase/migrations/20261024000000_account_data.sql`.
5. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Configure `LLM_API_KEY` only if prayer generation is desired.
6. Run `npm run dev`.

Without steps 4–5 the app remains guest-only. No successful auth or database sync is simulated.

## Production

- Deploy the Next.js app to a Node-compatible hosting platform that supports Next.js App Router route handlers. Set the same environment variables in the hosting provider's server environment; never commit `.env.local`.
- Apply reviewed Supabase migrations to the production project separately from app deployment. Verify RLS and auth redirect URLs before inviting users.
- Keep the anon key public as intended by Supabase. Keep `SUPABASE_SERVICE_ROLE_KEY` and `LLM_API_KEY` server-side only; restrict their dashboard access and rotate them if exposed.
- Use HTTPS, configure email delivery and allowed origins, select an appropriate data region, and configure database backups/retention and incident response.
- Build with `npm ci && npm run build`; start with `npm start` or the hosting platform's equivalent.
- Provide a shared rate limiter for prayer generation when deploying more than one app instance.

## Database setup

Apply the migration in the Supabase SQL editor or with the Supabase CLI linked to the intended project. It creates a single per-user snapshot table with a foreign key to `auth.users`, row-level security, a JSON shape/link check, and a revision-checked transactional RPC. Do not disable RLS or grant anonymous access to `account_data`.

For local acceptance testing, use a separate disposable Supabase project. Turn off email confirmation only in that test project if the test does not exercise mail delivery. Never use production accounts or data as fixtures.

## Environment variables

See `.env.example` for placeholder values. Supabase URL/anon key are required for account features; the service-role key is required only for account deletion. Prayer generation has a separate optional server-side LLM configuration.
