"use client";

import { useEffect, useRef, useState } from "react";
import { H, W } from "@/lib/asteroids/entities";
import { AsteroidsGame, clampDt, type Stats } from "@/lib/asteroids/game";
import { drawGame } from "@/lib/asteroids/render";

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);

type Props = {
  running: boolean;
  onStats: (stats: Stats) => void;
  onGameOver: () => void;
  createGame?: () => AsteroidsGame;
};

export default function AsteroidsCanvas({
  running,
  onStats,
  onGameOver,
  createGame = () => new AsteroidsGame(),
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

    const held = new Set<string>();
    let shoot = false;
    let lastTime: number | null = null;
    let lastStats = "";
    let frameId = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!GAME_KEYS.has(event.code)) return;
      event.preventDefault();
      if (event.repeat) return;
      held.add(event.code);
      if (event.code === "Space") shoot = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!GAME_KEYS.has(event.code)) return;
      event.preventDefault();
      held.delete(event.code);
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
      game.update(dt, {
        left: held.has("ArrowLeft"),
        right: held.has("ArrowRight"),
        thrust: held.has("ArrowUp"),
        shoot,
      });
      shoot = false;
      drawGame(ctx, game);
      publishStats();
      if (game.state === "gameover") {
        onGameOverRef.current();
        return;
      }
      frameId = requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [game, running]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={W}
      height={H}
      role="img"
      aria-label="Pantalla de ROCAS: una nave dispara a asteroides en el espacio"
    />
  );
}
