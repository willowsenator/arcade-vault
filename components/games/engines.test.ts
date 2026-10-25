import { describe, expect, it } from "vitest";
import { GAMES } from "@/lib/data";
import AsteroidsCanvas from "./AsteroidsCanvas";
import BloqueBusterCanvas from "./BloqueBusterCanvas";
import { ENGINES } from "./engines";

describe("engine registry", () => {
  it("provides music with at least one note for every engine", () => {
    for (const engine of Object.values(ENGINES)) {
      expect(engine.music.notes.length).toBeGreaterThan(0);
    }
  });

  it("registers every catalog engine with three lives and a controls hint", () => {
    const playable = GAMES.filter((game) => game.engine);
    expect(new Set(Object.keys(ENGINES))).toEqual(new Set(playable.map((game) => game.engine)));
    for (const game of playable) {
      const engine = ENGINES[game.engine!];
      expect(engine).toBeDefined();
      expect(engine.startLives).toBe(3);
      expect(engine.controlsHint.trim().length).toBeGreaterThan(0);
    }
  });

  it("maps engine ids to their canvases and exact Spanish controls", () => {
    expect(ENGINES.asteroids.Canvas).toBe(AsteroidsCanvas);
    expect(ENGINES.asteroids.controlsHint).toBe("← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR · P PAUSA");
    expect(ENGINES["bloque-buster"].Canvas).toBe(BloqueBusterCanvas);
    expect(ENGINES["bloque-buster"].controlsHint).toBe("← → / A D MOVER · RATÓN MOVER · P PAUSA");
  });
});
