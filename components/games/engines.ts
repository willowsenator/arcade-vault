import type { ComponentType } from "react";
import type { Game } from "@/lib/data";
import { START_LIVES as ASTEROIDS_START_LIVES } from "@/lib/asteroids/game";
import { START_LIVES as BLOQUE_BUSTER_START_LIVES } from "@/lib/bloque-buster/game";
import { START_LIVES as SNAKE_START_LIVES } from "@/lib/snake/game";
import { START_LIVES as TETRIS_START_LIVES } from "@/lib/tetris/game";
import { ASTEROIDS_MUSIC, BLOQUE_BUSTER_MUSIC, SNAKE_MUSIC, TETRIS_MUSIC } from "@/lib/sound/cues";
import type { MusicLoop } from "@/lib/sound/synth";
import AsteroidsCanvas from "./AsteroidsCanvas";
import BloqueBusterCanvas from "./BloqueBusterCanvas";
import SnakeCanvas from "./SnakeCanvas";
import TetrisCanvas from "./TetrisCanvas";

export type EngineId = NonNullable<Game["engine"]>;
export type EngineStats = { score: number; lives: number; level: number };
export type EngineCanvasProps = {
  running: boolean;
  onStats: (stats: EngineStats) => void;
  onGameOver: () => void;
};

export const ENGINES: Record<EngineId, {
  Canvas: ComponentType<EngineCanvasProps>;
  startLives: number;
  controlsHint: string;
  music: MusicLoop;
}> = {
  asteroids: {
    Canvas: AsteroidsCanvas,
    startLives: ASTEROIDS_START_LIVES,
    music: ASTEROIDS_MUSIC,
    controlsHint: "← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR · P PAUSA",
  },
  "bloque-buster": {
    Canvas: BloqueBusterCanvas,
    startLives: BLOQUE_BUSTER_START_LIVES,
    music: BLOQUE_BUSTER_MUSIC,
    controlsHint: "← → / A D MOVER · RATÓN MOVER · P PAUSA",
  },
  snake: {
    Canvas: SnakeCanvas,
    startLives: SNAKE_START_LIVES,
    music: SNAKE_MUSIC,
    controlsHint: "← ↑ ↓ → / WASD MOVER · P PAUSA",
  },
  tetris: {
    Canvas: TetrisCanvas,
    startLives: TETRIS_START_LIVES,
    music: TETRIS_MUSIC,
    controlsHint: "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAER · P PAUSA",
  },
};
