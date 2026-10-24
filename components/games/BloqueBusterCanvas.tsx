"use client";

import { useEffect, useRef, useState } from "react";
import { H, W } from "@/lib/bloque-buster/entities";
import { BloqueBusterGame, clampDt, type Stats } from "@/lib/bloque-buster/game";
import { drawGame } from "@/lib/bloque-buster/render";

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]);

type Props = {
  running: boolean;
  onStats: (stats: Stats) => void;
  onGameOver: () => void;
  createGame?: () => BloqueBusterGame;
};

export default function BloqueBusterCanvas({
  running,
  onStats,
  onGameOver,
  createGame = () => new BloqueBusterGame(),
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawGame(ctx, game);
    if (!running) return;

    const held = new Set<string>();
    let lastTime: number | null = null;
    let lastStats = "";
    let frameId = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!GAME_KEYS.has(event.code)) return;
      event.preventDefault();
      if (event.repeat) return;
      held.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!GAME_KEYS.has(event.code)) return;
      held.delete(event.code);
      if (!event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0) return;
      game.pointerTo((event.clientX - rect.left) * W / rect.width);
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
        left: held.has("ArrowLeft") || held.has("KeyA"),
        right: held.has("ArrowRight") || held.has("KeyD"),
      });
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
    canvas.addEventListener("pointermove", onPointerMove);
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointermove", onPointerMove);
    };
  }, [game, running]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={W}
      height={H}
      role="img"
      aria-label="Pantalla de BLOQUE BUSTER: una paleta rebota una pelota contra un muro de bloques"
    />
  );
}
