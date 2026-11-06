import { describe, expect, it } from "vitest";
import { COLS, ROWS, PIECES, collides, emptyBoard, rotate } from "./entities";

describe("falling piece geometry", () => {
  it("provides seven distinct tetrominoes in I, O, T, S, Z, J, L order", () => {
    expect(PIECES).toEqual([
      [[1, 1, 1, 1]],
      [[2, 2], [2, 2]],
      [[0, 3, 0], [3, 3, 3]],
      [[0, 4, 4], [4, 4, 0]],
      [[5, 5, 0], [0, 5, 5]],
      [[6, 0, 0], [6, 6, 6]],
      [[0, 0, 7], [7, 7, 7]],
    ]);
    expect(PIECES).toHaveLength(7);
    expect(new Set(PIECES.map((piece) => JSON.stringify(piece))).size).toBe(7);
  });

  it("rotates the L clockwise by transposing then reversing each row", () => {
    expect(rotate(PIECES[6])).toEqual([[7, 0], [7, 0], [7, 7]]);
  });

  it("restores every piece after four clockwise rotations", () => {
    for (const piece of PIECES) {
      expect(rotate(rotate(rotate(rotate(piece))))).toEqual(piece);
    }
  });

  it("rotates without mutating inputs or sharing their row arrays", () => {
    for (const piece of PIECES) {
      const before = piece.map((row) => [...row]);
      const rotated = rotate(piece);
      expect(piece).toEqual(before);
      expect(rotated).not.toBe(piece);
      for (const row of rotated) {
        for (const originalRow of piece) expect(row).not.toBe(originalRow);
      }
      rotated[0][0] = 99;
      expect(piece).toEqual(before);
    }
  });

  it("allows a free position inside the board", () => {
    expect(collides(emptyBoard(), PIECES[1], 4, 5)).toBe(false);
  });

  it("detects a filled cell beyond the left wall", () => {
    expect(collides(emptyBoard(), PIECES[1], -1, 0)).toBe(true);
  });

  it("detects a filled cell beyond the right wall", () => {
    expect(collides(emptyBoard(), PIECES[1], COLS - 1, 0)).toBe(true);
  });

  it("detects a filled cell reaching the bottom boundary", () => {
    expect(collides(emptyBoard(), PIECES[1], 0, ROWS - 1)).toBe(true);
    expect(collides(emptyBoard(), PIECES[0], 0, ROWS)).toBe(true);
  });

  it("detects overlap with a filled board cell", () => {
    const board = emptyBoard();
    board[6][5] = 3;
    expect(collides(board, PIECES[1], 4, 5)).toBe(true);
  });

  it("allows the top row above the board when columns are in bounds", () => {
    expect(collides(emptyBoard(), PIECES[1], 4, -1)).toBe(false);
  });

  it("still enforces side walls above the board", () => {
    expect(collides(emptyBoard(), PIECES[1], -1, -2)).toBe(true);
    expect(collides(emptyBoard(), PIECES[1], COLS - 1, -2)).toBe(true);
  });

  it("still detects occupied visible cells when spawning above the board", () => {
    const board = emptyBoard();
    board[0][4] = 6;
    expect(collides(board, PIECES[1], 4, -1)).toBe(true);
  });

  it("ignores empty shape cells outside the board and over occupied cells", () => {
    const board = emptyBoard();
    board[0][0] = 7;
    expect(collides(board, [[0, 1], [0, 0]], -1, 1)).toBe(false);
    expect(collides(board, [[1, 0]], COLS - 1, 0)).toBe(false);
    expect(collides(board, [[1], [0]], 0, ROWS - 1)).toBe(false);
    expect(collides(board, [[0, 1]], 0, 0)).toBe(false);
  });

  it("creates a 20 by 10 board of zeros", () => {
    expect([ROWS, COLS]).toEqual([20, 10]);
    const board = emptyBoard();
    expect(board).toHaveLength(ROWS);
    for (const row of board) expect(row).toEqual(Array(COLS).fill(0));
  });

  it("creates independent boards and independent rows", () => {
    const first = emptyBoard();
    const second = emptyBoard();
    expect(first).not.toBe(second);
    expect(new Set(first).size).toBe(ROWS);
    for (const row of first) {
      for (const otherRow of second) expect(row).not.toBe(otherRow);
    }
    first[0][0] = 7;
    expect(first[1][0]).toBe(0);
    expect(second[0][0]).toBe(0);
  });

  it("keeps board and piece cells numeric", () => {
    for (const matrix of [emptyBoard(), ...PIECES]) {
      for (const row of matrix) {
        for (const cell of row) expect(typeof cell).toBe("number");
      }
    }
  });
});
