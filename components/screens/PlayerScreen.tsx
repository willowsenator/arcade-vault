"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/data";
import { useAuth } from "@/components/AuthProvider";
import { NAME_REQUIRED_TO_SAVE, SAVE_SCORE_ERROR } from "@/lib/messages";
import { insertScore } from "@/lib/score-queries";
import { createClient } from "@/utils/supabase/client";
import { ENGINES, type EngineStats } from "@/components/games/engines";
import { sound, useSoundEnabled, setSoundEnabled } from "@/lib/sound";

export default function PlayerScreen({ game }: { game: Game }) {
  const { user } = useAuth();
  const engine = ENGINES[game.engine];
  const enabled = useSoundEnabled();
  const startLives = engine.startLives;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(startLives);
  const [level, setLevel] = useState(1);
  const [runId, setRunId] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? user?.name ?? "INVITADO";
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveRunRef = useRef(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const restartButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const cleanup = sound.armGestureUnlock();
    return () => {
      cleanup();
      sound.cancelPending();
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!paused && !over && !hidden) sound.startMusic(engine.music);
    else sound.stopMusic();
    return () => sound.stopMusic();
  }, [engine, paused, over, runId, hidden]);

  const handleStats = useCallback((stats: EngineStats) => {
    setScore(stats.score);
    setLives(stats.lives);
    setLevel(stats.level);
  }, []);

  useEffect(() => {
    if (over) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyP") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.matches("input, textarea, select") || target.isContentEditable
      )) return;
      event.preventDefault();
      if (event.repeat) return;
      setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [over]);

  const restart = useCallback(() => {
    sound.cancelPending();
    setScore(0);
    setLives(startLives);
    setLevel(1);
    setRunId((id) => id + 1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
    setSaving(false);
    saveRunRef.current += 1;
  }, [startLives]);

  const save = async () => {
    if (saving) return;
    const playerName = name.trim();
    if (!playerName) {
      setSaveError(NAME_REQUIRED_TO_SAVE);
      return;
    }
    const run = saveRunRef.current;
    setSaving(true);
    setSaveError(null);
    try {
      await insertScore(createClient(), { game: game.id, name: playerName, score });
      if (saveRunRef.current === run) setSaved(true);
    } catch (error) {
      console.error("PlayerScreen: saving the score failed", { game: game.id }, error);
      if (saveRunRef.current === run) {
        setSaveError(SAVE_SCORE_ERROR);
        nameInputRef.current?.focus();
      }
    } finally {
      if (saveRunRef.current === run) setSaving(false);
    }
  };

  useEffect(() => {
    if (!over) return;
    const focusTarget = saved ? restartButtonRef.current : nameInputRef.current;
    focusTarget?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") restart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [over, saved, restart]);

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v" data-testid="score-value">
              {score.toLocaleString("es-ES")}
            </div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v" data-testid="lives-value">
              {lives > 0 ? Array.from({ length: lives }, () => "♥").join(" ") : "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v" data-testid="level-value">
              {String(level).padStart(2, "0")}
            </div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            aria-keyshortcuts="P"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
          <button
            className="btn ghost"
            aria-pressed={enabled}
            onClick={() => setSoundEnabled(!enabled)}
          >
            SONIDO<span aria-hidden="true">{enabled ? ": SÍ" : ": NO"}</span>
          </button>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          <engine.Canvas
            key={runId}
            running={!paused && !over}
            onStats={handleStats}
            onGameOver={() => setOver(true)}
          />
          {paused && (
            <div
              className="crt-content"
              role="status"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      <p className="controls-hint">{engine.controlsHint}</p>
      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <>
                <div className="input-row">
                  <input
                    ref={nameInputRef}
                    value={name}
                    onChange={(event) =>
                      setNameOverride(
                        event.target.value.toUpperCase().slice(0, 10),
                      )
                    }
                    placeholder="TUS INICIALES"
                    readOnly={saving}
                  />
                  <button
                    className="btn yellow"
                    onClick={save}
                    aria-disabled={saving}
                  >
                    GUARDAR PUNTUACIÓN
                  </button>
                </div>
                {saveError && (
                  <div role="alert" style={{ color: "var(--magenta)" }}>
                    {saveError}
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button ref={restartButtonRef} className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
