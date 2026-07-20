import { afterEach, describe, expect, it } from "vitest";
import { selectRepos } from "@/app/composition/selectRepos";

describe("selectRepos", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
    if (originalKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  it("uses in-memory when Supabase env is missing", () => {
    const result = selectRepos({
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });
    expect(result.kind).toBe("memory");
  });

  it("selects supabase when URL and service role are set", () => {
    const result = selectRepos({
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
    });
    expect(result.kind).toBe("supabase");
    expect(result.repos.jobSpecs).toBeDefined();
    expect(result.repos.calls).toBeDefined();
    expect(result.repos.quotes).toBeDefined();
    expect(result.repos.audit).toBeDefined();
  });
});
