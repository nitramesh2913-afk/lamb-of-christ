import { authorizeRequest } from "@/lib/account/server";
import type { AccountSnapshot } from "@/lib/account/types";
import { EMPTY_ACCOUNT_SNAPSHOT } from "@/lib/account/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeRequest(request);
  if (authorization instanceof Response) return authorization;
  const { data, error } = await authorization.client
    .from("account_data")
    .select("data")
    .eq("user_id", authorization.user.id)
    .maybeSingle();
  if (error) return Response.json({ error: "Account data could not be exported. Retry when you are online." }, { status: 503 });
  const snapshot = (data?.data ?? EMPTY_ACCOUNT_SNAPSHOT) as AccountSnapshot;
  const exported = {
    app: "lamb-of-christ",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: snapshot.entries,
    prayers: snapshot.prayers,
    progress: snapshot.progress,
  };
  return new Response(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lamb-of-christ-account.json"',
      "Cache-Control": "no-store",
    },
  });
}
