import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getAccountConfig } from "@/app/api/account/config/route";
import { GET as getAccountData, PUT as putAccountData } from "@/app/api/account/data/route";
import { DELETE as deleteAccount } from "@/app/api/account/delete/route";

afterEach(() => vi.unstubAllEnvs());

describe("account API configuration and authorization", () => {
  it("reports account services as unavailable when no project is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await getAccountConfig();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ configured: false });
  });

  it("rejects private data reads without a verified bearer session", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    const response = await getAccountData(new Request("http://localhost/api/account/data"));
    expect(response.status).toBe(401);
  });

  it("rejects mutations and account deletion without a verified bearer session", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    const putResponse = await putAccountData(new Request("http://localhost/api/account/data", {
      method: "PUT",
      body: JSON.stringify({ expectedRevision: 0, data: {} }),
    }));
    const deleteResponse = await deleteAccount(new Request("http://localhost/api/account/delete", { method: "DELETE" }));
    expect(putResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
  });
});
