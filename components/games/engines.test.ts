import { describe, expect, it } from "vitest";
import { GAMES } from "@/lib/data";
import { SNAKE_MUSIC, TETRIS_MUSIC } from "@/lib/sound/cues";
import { START_LIVES as SNAKE_START_LIVES } from "@/lib/snake/game";
import AsteroidsCanvas from "./AsteroidsCanvas";
import BloqueBusterCanvas from "./BloqueBusterCanvas";
import SnakeCanvas from "./SnakeCanvas";
import TetrisCanvas from "./TetrisCanvas";
import { ENGINES } from "./engines";

describe("engine registry", () => {
  it("provides music with at least one note for every engine", () => {
    for (const engine of Object.values(ENGINES)) {
      expect(engine.music.notes.length).toBeGreaterThan(0);
    }
  });

  it("registers every catalog engine with its starting lives and a controls hint", () => {
    const playable = GAMES.filter((game) => game.engine);
    expect(new Set(Object.keys(ENGINES))).toEqual(new Set(playable.map((game) => game.engine)));
    for (const game of playable) {
      const engine = ENGINES[game.engine!];
      expect(engine).toBeDefined();
      expect(Number.isInteger(engine.startLives)).toBe(true);
      expect(engine.startLives).toBeGreaterThan(0);
      expect(engine.controlsHint.trim().length).toBeGreaterThan(0);
    }
  });

  it("registers the Tetris canvas, exact controls, music, and one starting life", () => {
    expect(ENGINES.tetris.Canvas).toBe(TetrisCanvas);
    expect(ENGINES.tetris.controlsHint).toBe("← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAER · P PAUSA");
    expect(ENGINES.tetris.music).toBe(TETRIS_MUSIC);
    expect(ENGINES.tetris.startLives).toBe(1);
  });

  it("maps engine ids to their canvases, three lives and exact Spanish controls", () => {
    expect(ENGINES.asteroids.Canvas).toBe(AsteroidsCanvas);
    expect(ENGINES.asteroids.startLives).toBe(3);
    expect(ENGINES.asteroids.controlsHint).toBe("← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR · P PAUSA");
    expect(ENGINES["bloque-buster"].Canvas).toBe(BloqueBusterCanvas);
    expect(ENGINES["bloque-buster"].startLives).toBe(3);
    expect(ENGINES["bloque-buster"].controlsHint).toBe("← → / A D MOVER · RATÓN MOVER · P PAUSA");
  });

  it("registers the snake engine with its canvas, single life, music and exact hint", () => {
    expect(ENGINES.snake.Canvas).toBe(SnakeCanvas);
    expect(ENGINES.snake.startLives).toBe(1);
    expect(ENGINES.snake.startLives).toBe(SNAKE_START_LIVES);
    expect(ENGINES.snake.music).toBe(SNAKE_MUSIC);
    expect(ENGINES.snake.controlsHint).toBe("← ↑ ↓ → / WASD MOVER · P PAUSA");
  });
});
