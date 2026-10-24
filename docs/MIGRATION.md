# Browser data migration and recovery

The app keeps a guest copy in browser storage and syncs a snapshot to Supabase after a user signs in. Signing in does not clear guest data. Database writes are revision-checked; stable record IDs prevent duplicate entries and prayers when a migration is retried.

## Browser keys

| Key | Contents |
| --- | --- |
| `loc.progress.v1` | Completed lessons, reflection answers, and reading level |
| `loc.journal.v1` | Versioned envelope with journal entries and saved prayers; legacy bare arrays and v1 envelopes remain readable |
| `loc.journal.v1.corrupt-backup` | Raw journal content preserved if parsing fails |
| `loc.sync.v1` | Sync metadata and deletion tombstones used to propagate deletes |

Prayer-to-journal links are stored in both records. The Postgres snapshot constraint requires valid, reciprocal links. Entries created from prayers remain independent journal records; deleting a prayer preserves the entry unless the user explicitly asks to delete both.

## First sign-in and retry

1. The app reads the current guest journal, prayers, lesson progress, and sync metadata.
2. It fetches the account snapshot and merges records by stable ID and `updatedAt`. Existing account data is not blindly replaced.
3. It submits the merged snapshot with the revision it read. The database function writes the update transactionally; a revision conflict causes a fresh read and bounded merge/retry.
4. Local data is retained. A network error or rejected write leaves the local copy intact and exposes a retry action on **My Account**.
5. Repeating the operation is idempotent. Deletion tombstones prevent an older device copy from reintroducing a deleted record.

An offline device cannot be contacted by account deletion and can retain its browser cache. Users should sign out and clear that browser's site data when they regain access to it.

## Recovery

- Before schema changes or account troubleshooting, download an account export from **My Account** or use the journal/prayer download while in guest mode.
- If the browser journal is unreadable, the original value is copied to `loc.journal.v1.corrupt-backup`; the app does not overwrite it while loading.
- If sync fails, do not clear browser storage. Restore connectivity and use **Retry sync**. The API reports failure rather than claiming success.
- To restore an account backup, sign in and use the records as a reference/import source. There is currently no user-facing JSON restore UI; do not manually edit production rows.
- Back up the Supabase project using the operator's configured backup and point-in-time recovery plan. Verify an actual restore before relying on it.

The schema, RLS policies, validation function, and transactional sync RPC are in `supabase/migrations/20261024000000_account_data.sql`. Test migrations against a disposable Supabase project before promoting them.
