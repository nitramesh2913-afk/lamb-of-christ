import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "./database";

export interface AuthorizedRequest {
  client: SupabaseClient<Database>;
  user: User;
}

export async function authorizeRequest(request: Request): Promise<AuthorizedRequest | Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ error: "Account storage is not configured on this server." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return Response.json({ error: "Sign in to access account data." }, { status: 401 });

  const client = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Your session is invalid or expired. Sign in again." }, { status: 401 });
  return { client, user: data.user };
}
