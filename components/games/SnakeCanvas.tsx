"use client";

import { useEffect, useRef, useState } from "react";
import { H, W, type Direction } from "@/lib/snake/entities";
import { SnakeGame, clampDt, type SnakeEvent, type Stats } from "@/lib/snake/game";
import { drawGame } from "@/lib/snake/render";
import { sound, type Cue } from "@/lib/sound";
import { SNAKE_CUES } from "@/lib/sound/cues";

const CUES = SNAKE_CUES satisfies Record<SnakeEvent, Cue>;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

type Props = {
  running: boolean;
  onStats: (stats: Stats) => void;
  onGameOver: () => void;
  createGame?: () => SnakeGame;
};

export default function SnakeCanvas({
  running,
  onStats,
  onGameOver,
  createGame = () => new SnakeGame(),
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game] = useState(createGame);
  const onStatsRef = useRef(onStats);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onStatsRef.current = onStats;
    onGameOverRef.current = onGameOver;
  });

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawGame(ctx, game); // keep the frame visible while paused
    if (!running) return;

    let lastTime: number | null = null;
    let lastStats = "";
    let frameId = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.code];
      if (!direction || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (event.repeat) return;
      game.steer(direction);
    };

    const publishStats = () => {
      const stats = game.stats;
      const key = `${stats.score}/${stats.lives}/${stats.level}`;
      if (key === lastStats) return;
      lastStats = key;
      onStatsRef.current(stats);
    };

    const frame = (timestamp: number) => {
      const dt = lastTime === null ? 0 : clampDt((timestamp - lastTime) / 1000);
      lastTime = timestamp;
      game.update(dt);
      for (const event of game.events) sound.play(CUES[event]);
      drawGame(ctx, game);
      publishStats();
      if (game.state === "gameover") {
        onGameOverRef.current();
        return;
      }
      frameId = requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", onKeyDown);
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [game, running]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={W}
      height={H}
      role="img"
      aria-label="Pantalla de SERPENTINA: una serpiente recoge comida en un tablero"
    />
  );
}
