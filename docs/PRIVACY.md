# Privacy and security notes

- Guest journal entries, saved prayers, and lesson progress stay in browser storage until an account is used. Browser storage is not encrypted by this application and is accessible to someone with access to that browser profile.
- On sign-in, account records are transmitted over HTTPS and stored in the configured Supabase project. PostgreSQL row-level security scopes the single account snapshot to `auth.uid()`. API handlers validate the user token; account deletion uses the service role only after verifying the caller and never accepts a target user ID.
- Prayer situation text and saved prayer content are sensitive. In account mode they are stored in the Supabase snapshot; the database provider and authorized project operators can access them. Transport and provider-managed at-rest encryption do not provide end-to-end encryption. Choose a region and retention policy appropriate for the data.
- The prayer-generation request is sent to the configured LLM provider when the user asks for AI writing. The route does not log request bodies or generated prayers. Review the provider's data-use and retention terms.
- Account exports contain personal reflections, prayer text, and progress. Protect downloaded files and delete them when no longer needed.
- Account deletion removes the Supabase Auth user and cascades the account snapshot, then clears the current browser cache only after the server confirms deletion. Other offline browsers cannot be wiped remotely.
- Never put the service-role key or LLM key in a `NEXT_PUBLIC_` variable or commit real environment files. `.env.local` is excluded from the deliverable package.
- The application does not currently provide client-side end-to-end encryption, multi-factor authentication UI, realtime push sync, audit-log viewing, or automated deletion of caches on disconnected devices.

Operators should review provider agreements, access controls, backup retention, breach response, and applicable privacy obligations before using the app with real sensitive data.
