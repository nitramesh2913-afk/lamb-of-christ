import { authorizeRequest } from "@/lib/account/server";
import type { AccountSnapshot } from "@/lib/account/types";
import type { Json } from "@/lib/account/database";
import { EMPTY_ACCOUNT_SNAPSHOT } from "@/lib/account/types";

export const dynamic = "force-dynamic";

function parseSnapshot(value: unknown): AccountSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<AccountSnapshot>;
  if (
    snapshot.version !== 1 ||
    !Array.isArray(snapshot.entries) ||
    !Array.isArray(snapshot.prayers) ||
    !Array.isArray(snapshot.deletedEntries) ||
    !Array.isArray(snapshot.deletedPrayers) ||
    !snapshot.progressVersions ||
    typeof snapshot.progressVersions !== "object" ||
    !snapshot.progress ||
    typeof snapshot.progress !== "object"
  ) return null;
  const hasRecords = (records: unknown[]) => records.every((record) =>
    !!record && typeof record === "object" &&
    typeof (record as { id?: unknown }).id === "string" &&
    typeof (record as { updatedAt?: unknown }).updatedAt === "string" &&
    typeof (record as { createdAt?: unknown }).createdAt === "string");
  const hasTombstones = (records: unknown[]) => records.every((record) =>
    !!record && typeof record === "object" &&
    typeof (record as { id?: unknown }).id === "string" &&
    typeof (record as { deletedAt?: unknown }).deletedAt === "string");
  if (!hasRecords(snapshot.entries) || !hasRecords(snapshot.prayers) ||
      !hasTombstones(snapshot.deletedEntries) || !hasTombstones(snapshot.deletedPrayers)) return null;
  if (new Set(snapshot.entries.map((entry) => entry.id)).size !== snapshot.entries.length ||
      new Set(snapshot.prayers.map((prayer) => prayer.id)).size !== snapshot.prayers.length) return null;
  if (
    !snapshot.progress.completed || typeof snapshot.progress.completed !== "object" ||
    !snapshot.progress.answers || typeof snapshot.progress.answers !== "object" ||
    !["beginner", "intermediate", "indepth"].includes(snapshot.progress.level)
  ) return null;
  if (!Object.values(snapshot.progress.completed).every((value) => typeof value === "boolean") ||
      !Object.values(snapshot.progress.answers).every((value) => Array.isArray(value) && value.every((answer) => typeof answer === "string"))) return null;
  if (!Object.values(snapshot.progressVersions).every((timestamp) => typeof timestamp === "string")) return null;
  const entriesById = new Map(snapshot.entries.map((entry) => [entry.id, entry]));
  const prayersById = new Map(snapshot.prayers.map((prayer) => [prayer.id, prayer]));
  if (snapshot.prayers.some((prayer) => {
    const linkedEntryId = prayer.journalEntryId;
    if (linkedEntryId === undefined) return false;
    return entriesById.get(linkedEntryId)?.prayerId !== prayer.id;
  })) return null;
  if (snapshot.entries.some((entry) => {
    const prayerId = entry.prayerId;
    if (prayerId === undefined) return false;
    return prayersById.get(prayerId)?.journalEntryId !== entry.id;
  })) return null;
  return snapshot as AccountSnapshot;
}

function rpcResponse(value: Json): { ok: boolean; revision: number; data: AccountSnapshot } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const response = value as { [key: string]: Json | undefined };
  const data = parseSnapshot(response.data);
  if (typeof response.ok !== "boolean" || typeof response.revision !== "number" || !data) return null;
  return { ok: response.ok, revision: response.revision, data };
}

export async function GET(request: Request) {
  const authorization = await authorizeRequest(request);
  if (authorization instanceof Response) return authorization;
  const { data, error } = await authorization.client
    .from("account_data")
    .select("revision,data")
    .eq("user_id", authorization.user.id)
    .maybeSingle();
  if (error) return Response.json({ error: "Account data could not be loaded. Retry when you are online." }, { status: 503 });
  if (!data) return Response.json({ revision: 0, data: EMPTY_ACCOUNT_SNAPSHOT }, { headers: { "Cache-Control": "no-store" } });
  const snapshot = parseSnapshot(data.data);
  if (!snapshot) return Response.json({ error: "Stored account data failed validation. Contact support before retrying." }, { status: 500 });
  return Response.json({ revision: data.revision, data: snapshot }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const authorization = await authorizeRequest(request);
  if (authorization instanceof Response) return authorization;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The sync request must contain valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ error: "The sync request is invalid." }, { status: 400 });
  const value = body as { expectedRevision?: unknown; data?: unknown };
  if (!Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 0) {
    return Response.json({ error: "The account revision is invalid." }, { status: 400 });
  }
  const snapshot = parseSnapshot(value.data);
  if (!snapshot) return Response.json({ error: "The account data is invalid or incomplete." }, { status: 400 });

  const { data, error } = await authorization.client.rpc("sync_account_data", {
    p_data: JSON.parse(JSON.stringify(snapshot)) as Json,
    p_expected_revision: value.expectedRevision as number,
  });
  if (error) return Response.json({ error: "Account data could not be saved. Your local copy is safe; retry when online." }, { status: 503 });
  const result = rpcResponse(data);
  if (!result) return Response.json({ error: "The account service returned an invalid sync result." }, { status: 500 });
  if (!result.ok) {
    return Response.json({ revision: result.revision, data: result.data, error: "Account data changed on another device." }, { status: 409 });
  }
  return Response.json({ revision: result.revision, data: result.data }, { headers: { "Cache-Control": "no-store" } });
}
