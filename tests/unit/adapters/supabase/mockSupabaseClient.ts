import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

/** Minimal chainable mock matching `.insert().select().single()` / `.update().eq().select().single()`. */
export function createInsertSelectMock(handlers: {
  onInsert?: (table: string, row: Row) => Row;
  onUpdate?: (table: string, row: Row, id: unknown) => Row;
  onSelectSingle?: (table: string, id: unknown) => Row | null;
  onSelectList?: (table: string, col: string, val: unknown) => Row[];
}): SupabaseClient {
  return {
    from(table: string) {
      return {
        insert(row: Row) {
          return {
            select() {
              return {
                async single() {
                  const data = handlers.onInsert?.(table, row) ?? {
                    id: "generated",
                    ...row,
                  };
                  return { data, error: null };
                },
              };
            },
          };
        },
        select() {
          return {
            eq(col: string, val: unknown) {
              return {
                async single() {
                  const data = handlers.onSelectSingle?.(table, val) ?? null;
                  if (!data) {
                    return {
                      data: null,
                      error: { code: "PGRST116", message: "0 rows" },
                    };
                  }
                  return { data, error: null };
                },
                async order() {
                  const data =
                    handlers.onSelectList?.(table, col, val) ?? [];
                  return { data, error: null };
                },
              };
            },
          };
        },
        update(row: Row) {
          return {
            eq(_col: string, id: unknown) {
              return {
                select() {
                  return {
                    async single() {
                      const data = handlers.onUpdate?.(table, row, id) ?? {
                        id,
                        ...row,
                      };
                      return { data, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}
