"use client";

import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LOCAL_CHANGE_EVENT, mergeAccountSnapshots, readLocalSnapshot, writeLocalSnapshot } from "@/lib/account/localSync";
import type { AccountDataResponse, AccountSnapshot } from "@/lib/account/types";

type SyncStatus = "loading" | "guest" | "syncing" | "synced" | "error" | "unavailable";

interface AccountContextValue {
  configured: boolean;
  user: User | null;
  client: SupabaseClient | null;
  syncStatus: SyncStatus;
  syncError: string;
  retrySync: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);
const GUEST_ACCOUNT: AccountContextValue = {
  configured: false,
  user: null,
  client: null,
  syncStatus: "unavailable",
  syncError: "",
  retrySync: () => {},
};

function asAccountData(value: unknown): AccountDataResponse {
  if (!value || typeof value !== "object" || !("data" in value) || !("revision" in value)) {
    throw new Error("The account service returned an invalid response.");
  }
  const response = value as AccountDataResponse;
  if (!Number.isSafeInteger(response.revision) || response.revision < 0 || !response.data || response.data.version !== 1) {
    throw new Error("The account service returned an invalid response.");
  }
  return response;
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  } catch {
    return `Account sync failed (${response.status}).`;
  }
  return `Account sync failed (${response.status}).`;
}

function tokenFor(session: Session): string {
  return session.access_token;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncError, setSyncError] = useState("");
  const sessionRef = useRef<Session | null>(null);
  const syncingRef = useRef(false);
  const queuedRef = useRef(false);
  const syncRef = useRef<() => Promise<void>>(async () => {});

  const synchronize = useCallback(async () => {
    if (syncingRef.current) {
      queuedRef.current = true;
      return;
    }
    const activeClient = client;
    if (!activeClient || !sessionRef.current) return;

    syncingRef.current = true;
    setSyncStatus("syncing");
    setSyncError("");
    try {
      do {
        queuedRef.current = false;
        let synchronized = false;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const { data: sessionData, error: sessionError } = await activeClient.auth.getSession();
          if (sessionError) throw new Error("Your session could not be refreshed. Please sign in again.");
          const session = sessionData.session;
          if (!session) {
            sessionRef.current = null;
            setUser(null);
            setSyncStatus("guest");
            return;
          }
          const headers = { Authorization: `Bearer ${tokenFor(session)}`, "Content-Type": "application/json" };
          const readResponse = await fetch("/api/account/data", { headers, cache: "no-store" });
          if (!readResponse.ok) throw new Error(await responseMessage(readResponse));
          const remote = asAccountData(await readResponse.json());
          const local = readLocalSnapshot();
          const merged = mergeAccountSnapshots(local, remote.data);
          if (canonical(merged) === canonical(remote.data)) {
            if (canonical(local) !== canonical(remote.data) && !writeLocalSnapshot(remote.data)) {
              throw new Error("Your account data was loaded, but the local copy could not be updated.");
            }
            setSyncStatus("synced");
            setSyncError("");
            synchronized = true;
            break;
          }
          if (!writeLocalSnapshot(merged)) throw new Error("Your local data could not be saved. Check available browser storage and retry.");

          const saveResponse = await fetch("/api/account/data", {
            method: "PUT",
            headers,
            body: JSON.stringify({ expectedRevision: remote.revision, data: merged }),
          });
          if (saveResponse.status === 409) continue;
          if (!saveResponse.ok) throw new Error(await responseMessage(saveResponse));
          const saved = asAccountData(await saveResponse.json());
          const latest = mergeAccountSnapshots(readLocalSnapshot(), saved.data);
          if (!writeLocalSnapshot(latest)) throw new Error("Your account is synced, but the local copy could not be updated.");
          if (canonical(latest) !== canonical(saved.data)) queuedRef.current = true;
          setSyncStatus("synced");
          setSyncError("");
          synchronized = true;
          break;
        }
        if (!synchronized) throw new Error("Your account changed on another device. Retry to merge the latest changes.");
      } while (queuedRef.current);
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Account sync failed. Retry when you are online.");
    } finally {
      syncingRef.current = false;
      if (queuedRef.current && sessionRef.current) void syncRef.current();
    }
  }, [client]);

  syncRef.current = synchronize;

  useEffect(() => {
    let active = true;
    fetch("/api/account/config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<{ configured: boolean; url?: string; anonKey?: string }>;
      })
      .then((config) => {
        if (!active) return;
        if (!config.configured || !config.url || !config.anonKey) {
          setSyncStatus("unavailable");
          return;
        }
        setClient(createClient(config.url, config.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Account configuration could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session;
      setUser(session?.user ?? null);
      if (session) queueMicrotask(() => { if (active) void syncRef.current(); });
      else setSyncStatus("guest");
    });
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setSyncStatus("error");
        setSyncError("Your saved session could not be loaded. Please sign in again.");
        return;
      }
      sessionRef.current = data.session;
      setUser(data.session?.user ?? null);
      if (data.session) void syncRef.current();
      else setSyncStatus("guest");
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => {
    const onChange = () => { void syncRef.current(); };
    const onFocus = () => { void syncRef.current(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "loc.journal.v1" || event.key === "loc.progress.v1" || event.key === "loc.sync.v1") onChange();
    };
    let timer: number | undefined;
    const onLocalChange = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(onChange, 500);
    };
    window.addEventListener(LOCAL_CHANGE_EVENT, onLocalChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    const poll = window.setInterval(onFocus, 30_000);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener(LOCAL_CHANGE_EVENT, onLocalChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const value = useMemo(() => ({
    configured: client !== null,
    user,
    client,
    syncStatus,
    syncError,
    retrySync: () => { void syncRef.current(); },
  }), [client, user, syncStatus, syncError]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  return useContext(AccountContext) ?? GUEST_ACCOUNT;
}

export function accountDataForExport(snapshot: AccountSnapshot): string {
  return JSON.stringify({
    app: "lamb-of-christ",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: snapshot.entries,
    prayers: snapshot.prayers,
    progress: snapshot.progress,
  }, null, 2);
}
