# Lamb of Christ

Walk Daily on the Bible Way. This Next.js App Router application includes the existing Bible explorer and lessons (Stages 1–2), journal and reviews (Stage 3), personalized prayer (Stage 4), and optional Supabase accounts for private cross-device sync.

## Features

- Guest access with browser-local lesson progress, journal entries, and saved prayers.
- Supabase email/password registration and sign-in, session persistence, and guest-data migration.
- PostgreSQL account data protected by row-level security and optimistic revision checks.
- Linked prayer/journal records, lesson progress, retryable sync, account export, and account deletion.
- Existing responsive layouts and Stage 1–4 functionality remain available without account configuration.

## Local setup

Requirements: Node.js 20.19+ (or a current supported LTS) and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Without Supabase credentials, the application runs in guest mode; registration, database sync, server export, and server account deletion are unavailable rather than simulated.

### Configure Supabase

1. Create a Supabase project and configure email/password authentication and the site's allowed redirect URLs. For local acceptance testing, disable email confirmation only in a disposable test project, or complete the email confirmation flow.
2. Apply `supabase/migrations/20261024000000_account_data.sql` using the Supabase SQL editor or Supabase CLI. The migration creates the account-data schema, validation constraints, row-level security policies, and an optimistic sync function.
3. Copy the project URL, anon/public key, and server-only service-role key into `.env.local` using the matching names in `.env.example`. Never expose the service-role key to client code.
4. Restart the development server. Use `/journey` → **My Account** to create an account or sign in. Guest data is merged and retained locally if the network fails; successful sync is idempotent by stable record ID.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for local/production configuration, [docs/MIGRATION.md](./docs/MIGRATION.md) for data migration and recovery, [docs/PRIVACY.md](./docs/PRIVACY.md) for privacy notes, and [docs/TESTING.md](./docs/TESTING.md) for the real-service acceptance walkthrough.

## Prayer generation configuration

Prayer writing is optional and requires a server-side `LLM_API_KEY`. `LLM_PROVIDER` supports `anthropic` (default) or `openai`; `LLM_MODEL` is required for OpenAI-compatible providers. Optional `LLM_BASE_URL` must use HTTPS (HTTP is allowed for localhost), and `LLM_TIMEOUT_MS` defaults to 30000.

Prayer Scripture is selected from a curated collection of 53 public-domain KJV passages; model output cannot supply or alter quotations. If the LLM is unavailable, people can still write and save their own prayer. The request is sent to the configured provider; review its privacy terms.

## Commands

```powershell
npm test
npm run build
npm start
```

`npm test` runs the Vitest suite. `npm run build` creates the optimized production build; `npm start` serves it. No live Supabase acceptance result is claimed unless a real project and credentials have been configured and the walkthrough in `docs/TESTING.md` has passed.

## Known limitations

- Cross-device storage requires a configured Supabase project and applied migration; guest mode is local to one browser.
- Sync checks on local changes, tab focus, and periodically while the app is open. It is not an always-on realtime subscription.
- A conflict is retried and merged by stable IDs and record timestamps; a high-conflict session may require a manual retry.
- Account deletion removes server data and the current browser's local copy. Offline browsers cannot be remotely cleared.
- Scripture quotations are English KJV only. Prayer rate limiting is per server instance; use a shared limiter for multi-instance production. The support notice uses a simple keyword check and should not replace professional help.
- Service configuration, email deliverability, database constraints/RLS, and cross-device behavior must be verified against the operator's own Supabase project.
