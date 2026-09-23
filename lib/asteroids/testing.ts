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

/** A 2D context that records drawn text and ignores every other call. */
export function stubContext(): { ctx: CanvasRenderingContext2D; texts: string[] } {
  const texts: string[] = [];
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get: (target, prop: string) => {
      if (prop === "fillText") return (text: string) => void texts.push(text);
      return prop in target ? target[prop] : () => {};
    },
    set: (target, prop: string, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}
