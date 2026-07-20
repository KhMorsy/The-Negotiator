import { createInMemoryRepos } from "@/adapters/fake/inMemoryRepos";
import { createSupabaseRepos } from "@/adapters/persistence/supabase/createSupabaseRepos";
import { createSupabaseServiceClient } from "@/adapters/persistence/supabase/createSupabaseServiceClient";

export type PersistenceKind = "memory" | "supabase";

export function selectRepos(env: NodeJS.ProcessEnv = process.env): {
  repos: ReturnType<typeof createInMemoryRepos>;
  kind: PersistenceKind;
} {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (url && serviceRoleKey) {
    const client = createSupabaseServiceClient(url, serviceRoleKey);
    return {
      repos: createSupabaseRepos(client),
      kind: "supabase",
    };
  }

  return {
    repos: createInMemoryRepos(),
    kind: "memory",
  };
}
