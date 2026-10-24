"use client";

import { useState } from "react";
import { PROGRESS_KEY, SYNC_META_KEY } from "@/lib/account/localSync";
import { JOURNAL_BACKUP_KEY, JOURNAL_KEY } from "@/lib/journal";
import { useAccount } from "./AccountProvider";

const field = "mt-1 w-full min-h-[48px] rounded-full border border-gold/30 bg-white/70 px-4";

export function AccountPanel() {
  const { configured, user, client, syncStatus, syncError, retrySync } = useAccount();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setMessage(""); setError("");
    const result = creating
      ? await client.auth.signUp({ email: email.trim(), password })
      : await client.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || (creating
        ? "Your account could not be created. Check the email and password requirements, then retry."
        : "Sign-in failed. Check your email and password, then retry."));
      return;
    }
    if (creating && !result.data.session) {
      setMessage("Account created. Check your email to confirm the address, then sign in here.");
      setCreating(false);
      setPassword("");
    } else {
      setMessage(creating ? "Account created. Your guest data is being migrated." : "Signed in. Your data is syncing.");
      setPassword("");
    }
  };

  const exportAccount = async () => {
    if (!client) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError || !data.session) {
      setBusy(false);
      setError("Your session could not be verified. Sign in again before exporting.");
      return;
    }
    try {
      const response = await fetch("/api/account/export", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        setError("Your account data could not be exported. Retry when you are online.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "lamb-of-christ-account.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Account data exported.");
    } catch {
      setError("Export failed because the server could not be reached. Your account data remains unchanged.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!client) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError || !data.session) {
      setBusy(false);
      setError("Your session could not be verified. Sign in again before deleting your account.");
      return;
    }
    let response: Response;
    try {
      response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
    } catch {
      setError("Account deletion could not be confirmed. Local data was not cleared; check your connection and retry.");
      setBusy(false);
      setConfirmDelete(false);
      return;
    }
    if (!response.ok) {
      setError("Your account could not be deleted. No local data was removed; retry or contact the administrator.");
      setBusy(false);
      setConfirmDelete(false);
      return;
    }

    let localCleared = true;
    for (const key of [JOURNAL_KEY, JOURNAL_BACKUP_KEY, PROGRESS_KEY, SYNC_META_KEY]) {
      try { localStorage.removeItem(key); }
      catch { localCleared = false; }
    }
    let signOutFailed = false;
    try { signOutFailed = !!(await client.auth.signOut()).error; }
    catch { signOutFailed = true; }
    setMessage(signOutFailed
      ? "Your server account was deleted, but this browser could not clear the saved session. Clear this site's browser data."
      : localCleared
        ? "Your account and its server data were deleted. This browser's saved data was also cleared."
        : "Your server account was deleted, but this browser could not clear all saved data. Clear this site's browser storage.");
    setBusy(false);
    setConfirmDelete(false);
  };

  return (
    <section className="space-y-5 animate-fadeUp">
      <header>
        <h1 className="font-display text-3xl font-extrabold">My account</h1>
        <p className="text-cocoa-soft">Use an account to securely sync your walk across devices. Guest data stays on this device until you sign in.</p>
      </header>

      {!configured ? (
        <div className="panel p-5 space-y-3">
          {syncStatus === "loading" ? (
            <>
              <h2 className="font-display text-xl font-extrabold">Checking account service</h2>
              <p role="status" className="text-cocoa-soft">Guest features are available while account configuration loads.</p>
            </>
          ) : syncStatus === "error" ? (
            <>
              <h2 className="font-display text-xl font-extrabold">Account service could not be checked</h2>
              <p role="alert" className="text-cocoa-soft">{syncError}</p>
              <button type="button" className="btn-ghost" onClick={() => window.location.reload()}>Retry configuration</button>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-extrabold">Account service not configured</h2>
              <p role="status" className="text-cocoa-soft">
                Guest features remain available. To enable accounts, create a Supabase project, apply the SQL migration in
                <code className="mx-1">supabase/migrations</code>, and set <code>NEXT_PUBLIC_SUPABASE_URL</code> and
                <code className="mx-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in the server environment.
              </p>
              <p className="text-sm text-cocoa-soft">Do not put the service-role key in a browser-visible variable. Account deletion also requires the server-only <code>SUPABASE_SERVICE_ROLE_KEY</code>.</p>
            </>
          )}
        </div>
      ) : user ? (
        <div className="panel p-5 space-y-4">
          <div>
            <p className="text-sm text-cocoa-soft">Signed in as</p>
            <p className="font-bold break-all">{user.email}</p>
          </div>
          <div className="space-y-2" aria-live="polite">
            <p role="status">
              {syncStatus === "syncing" && "Syncing your journal, prayers, and lesson progress…"}
              {syncStatus === "synced" && "Your account data is synced. This device will check again when you return."}
              {syncStatus === "error" && (syncError || "Sync failed.")}
              {syncStatus === "guest" && "Signed out."}
              {syncStatus === "loading" && "Checking your account…"}
              {syncStatus === "unavailable" && "The account service is unavailable."}
            </p>
            {syncStatus === "error" && <button type="button" className="btn-ghost" onClick={retrySync}>Retry sync</button>}
          </div>
          {error && <p role="alert" className="text-cocoa font-semibold">{error}</p>}
          {message && <p role="status" className="text-sage-dark font-semibold">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => void exportAccount()} disabled={busy}>Export account data</button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={async () => {
              setError(""); setMessage("");
              const { error: signOutError } = await client!.auth.signOut();
              if (signOutError) setError("Sign-out failed. Retry when your connection is available.");
              else setMessage("Signed out. Your data remains saved on this device.");
            }}>Sign out</button>
          </div>
          <div className="border-t border-gold/20 pt-4 space-y-3">
            <h2 className="font-display text-lg font-extrabold">Delete account</h2>
            <p className="text-sm text-cocoa-soft">This permanently deletes the account and synced server data. Local data on other devices cannot be removed while they are offline.</p>
            {!confirmDelete ? (
              <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(true)}>Delete my account</button>
            ) : (
              <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm account deletion">
                <span className="font-bold">Delete the account and synced data permanently?</span>
                <button type="button" className="btn" onClick={() => void deleteAccount()} disabled={busy}>Yes, delete account</button>
                <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep account</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form className="panel p-5 space-y-4" onSubmit={(event) => void submit(event)}>
          <h2 className="font-display text-xl font-extrabold">{creating ? "Create your account" : "Sign in"}</h2>
          <label className="block">
            <span className="font-bold">Email address</span>
            <input className={field} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block">
            <span className="font-bold">Password</span>
            <input className={field} type="password" autoComplete={creating ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            {creating && <span className="text-xs text-cocoa-soft">Use at least 8 characters; your provider may require more.</span>}
          </label>
          {error && <p role="alert" className="text-cocoa font-semibold">{error}</p>}
          {message && <p role="status" className="text-sage-dark font-semibold">{message}</p>}
          <button type="submit" className="btn" disabled={busy}>{busy ? "Please wait…" : creating ? "Create account and migrate guest data" : "Sign in and sync"}</button>
          <p className="text-sm">
            {creating ? "Already have an account? " : "New here? "}
            <button type="button" className="font-bold text-sage-dark underline" onClick={() => { setCreating(!creating); setError(""); setMessage(""); }}>
              {creating ? "Sign in" : "Create account"}
            </button>
          </p>
          <p className="text-xs text-cocoa-soft">Signing in uploads guest entries, prayers, and lesson progress using stable record IDs. Existing records are merged, not replaced. Data remains on this device if the server is unavailable.</p>
        </form>
      )}
    </section>
  );
}
