import type { ComponentType } from "react";
import type { Game } from "@/lib/data";
import { START_LIVES as ASTEROIDS_START_LIVES } from "@/lib/asteroids/game";
import { START_LIVES as BLOQUE_BUSTER_START_LIVES } from "@/lib/bloque-buster/game";
import { ASTEROIDS_MUSIC, BLOQUE_BUSTER_MUSIC } from "@/lib/sound/cues";
import type { MusicLoop } from "@/lib/sound/synth";
import AsteroidsCanvas from "./AsteroidsCanvas";
import BloqueBusterCanvas from "./BloqueBusterCanvas";

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
};
