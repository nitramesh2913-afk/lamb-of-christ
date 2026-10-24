import { createClient } from "@supabase/supabase-js";
import { authorizeRequest } from "@/lib/account/server";
import type { Database } from "@/lib/account/database";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const authorization = await authorizeRequest(request);
  if (authorization instanceof Response) return authorization;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Account deletion is not configured on this server. Contact the administrator." }, { status: 503 });
  }
  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { error } = await admin.auth.admin.deleteUser(authorization.user.id);
  if (error) return Response.json({ error: "Your account could not be deleted. Contact the administrator or retry." }, { status: 503 });
  return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
}
