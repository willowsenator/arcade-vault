import { describe, expect, it } from "vitest";
import { H, W, isOpposite, levelFor, stepInterval } from "./entities";

describe("isOpposite", () => {
  it("is true for reversing directions", () => {
    expect(isOpposite("left", "right")).toBe(true);
    expect(isOpposite("up", "down")).toBe(true);
  });

  it("is false for perpendicular or equal directions", () => {
    expect(isOpposite("left", "up")).toBe(false);
    expect(isOpposite("left", "left")).toBe(false);
  });
});

describe("stepInterval", () => {
  it("starts at the base interval", () => {
    expect(stepInterval(1)).toBe(0.15);
  });

  it("shrinks with every level", () => {
    for (let n = 1; n <= 50; n++) {
      expect(stepInterval(n + 1)).toBeLessThan(stepInterval(n));
    }
  });
});

describe("levelFor", () => {
  it("raises the level every fifth food", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(4)).toBe(1);
    expect(levelFor(5)).toBe(2);
    expect(levelFor(10)).toBe(3);
  });
});

describe("board size", () => {
  it("is 480 by 480 pixels", () => {
    expect(W).toBe(480);
    expect(H).toBe(480);
  });
});
