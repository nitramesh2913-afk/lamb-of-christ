export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ configured: false }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ configured: true, url, anonKey }, { headers: { "Cache-Control": "no-store" } });
}
