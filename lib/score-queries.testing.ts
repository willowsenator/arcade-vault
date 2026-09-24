import type { ScoresClient } from "./score-queries";

export type RecordedCall = { method: string; args: unknown[] };
export type Query = { table: string; calls: RecordedCall[] };
export type Result = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

const CHAINED = ["select", "insert", "eq", "gt", "lt", "order", "limit"];

export function fakeClient(respond: (query: Query) => Result) {
  const queries: Query[] = [];
  const client = {
    from(table: string) {
      const query: Query = { table, calls: [] };
      queries.push(query);
      const builder: Record<string, unknown> = {};
      for (const method of CHAINED) {
        builder[method] = (...args: unknown[]) => {
          query.calls.push({ method, args });
          return builder;
        };
      }
      builder.then = (
        resolve: (value: Result) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve({ data: null, error: null, count: null, ...respond(query) }).then(resolve, reject);
      return builder;
    },
  };
  return { client: client as unknown as ScoresClient, queries };
}
