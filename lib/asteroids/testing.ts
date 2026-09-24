import type { Random } from "./entities";

/** Deterministic random source (mulberry32) so engine tests never flake. */
export function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 2D context that records drawing calls and ignores their effects. */
export function stubContext(): {
  ctx: CanvasRenderingContext2D;
  texts: string[];
  calls: { name: string; args: unknown[] }[];
} {
  const texts: string[] = [];
  const calls: { name: string; args: unknown[] }[] = [];
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get: (target, prop: string) => {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        calls.push({ name: prop, args });
        if (prop === "fillText") texts.push(args[0] as string);
      };
    },
    set: (target, prop: string, value) => {
      calls.push({ name: prop, args: [value] });
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, calls };
}
