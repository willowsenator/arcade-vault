"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { TetrisGame, clampDt, type Input, type Stats, type TetrisEvent } from "@/lib/tetris/game";
import { drawGame, H, W } from "@/lib/tetris/render";
import { sound, type Cue } from "@/lib/sound";
import { TETRIS_CUES } from "@/lib/sound/cues";

const CUES = TETRIS_CUES satisfies Record<TetrisEvent, Cue>;

const GAME_KEYS = new Map<string, keyof Input>([
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
  ["ArrowDown", "softDrop"],
  ["ArrowUp", "rotate"],
  ["KeyX", "rotate"],
  ["Space", "hardDrop"],
]);

// Space and the arrows belong to a focused control (PAUSA, SONIDO, a link, a field).
const isInteractive = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches("button, a[href], input, select, textarea");

export default function TetrisCanvas({
  running,
  onStats,
  onGameOver,
  createGame = () => new TetrisGame(),
}: {
  running: boolean;
  onStats: (stats: Stats) => void;
  onGameOver: () => void;
  createGame?: () => TetrisGame;
}): JSX.Element {
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
    drawGame(ctx, game);
    if (!running) return;

    const pending: Input = { left: false, right: false, rotate: false, softDrop: false, hardDrop: false };
    let lastTime: number | null = null;
    let lastStats = "";
    let frameId = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const action = GAME_KEYS.get(event.code);
      if (!action || isInteractive(event.target)) return;
      event.preventDefault();
      if (event.repeat && action !== "left" && action !== "right" && action !== "softDrop") return;
      pending[action] = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!GAME_KEYS.has(event.code) || isInteractive(event.target)) return;
      event.preventDefault();
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
      game.update(dt, { ...pending });
      pending.left = false;
      pending.right = false;
      pending.rotate = false;
      pending.softDrop = false;
      pending.hardDrop = false;
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
      aria-label="Pantalla de CAÍDA: piezas que caen y se apilan para completar líneas"
    />
  );
}
