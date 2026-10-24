# Tests and real-service acceptance

## Automated checks

```powershell
npm test
npm run build
```

The Vitest suite covers the existing Stage 1–4 workflows and local storage behavior. Account snapshot tests cover merge, deletion-tombstone, progress, and prayer/journal-link behavior. A passing local suite does not prove a Supabase project is configured or reachable.

## Real Supabase walkthrough

Use a disposable Supabase project with the migration applied and email/password authentication configured. Use two clean browser profiles (or a normal and private browser) and two distinct test accounts. If email confirmation is disabled to simplify the test, do so only in this disposable project.

1. Open the app in a clean browser as a guest.
2. Open Genesis 1, answer the quiz, and mark the lesson complete.
3. Enter a reflection and save it to the journal.
4. Write a prayer without requiring an LLM key, save it, and add it to the journal. Verify the linked prayer and journal entry IDs.
5. Create a real Supabase account. Confirm guest data is migrated and that the local journal remains available.
6. Verify the matching account snapshot and reciprocal links in the project's `public.account_data` row for that authenticated user. Do not query or print private record text in shared logs.
7. In a second clean browser profile, sign in to the same account. Verify progress, reflection, prayer, and link appear.
8. Edit the journal record in browser one. Wait for sync or focus browser two; verify the new text appears.
9. Sign in as the second test account and verify it starts with no access to the first account's records. Confirm direct requests run as that account return only its own row.
10. Export account data from **My Account**. Parse the downloaded JSON and verify the expected record IDs and linked IDs.
11. Delete the disposable test accounts and project data after validation.

This walkthrough requires actual Supabase credentials, enabled auth, deployed schema, and two test accounts. Do not use stubbed authentication/data responses as a substitute. If these prerequisites are unavailable, report the live acceptance workflow as unverified.
