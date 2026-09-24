"use client";

import Link from "next/link";
import { type MouseEvent, useRef } from "react";
import type { Game } from "@/lib/data";

export default function GameCard({ game, best }: { game: Game; best: number | null }) {
  const tiltRef = useRef<HTMLAnchorElement>(null);
  const onMove = (event: MouseEvent<HTMLAnchorElement>) => {
    const element = tiltRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };
  return (
    <Link
      href={`/games/${game.id}`}
      ref={tiltRef}
      className="card"
      onMouseMove={onMove}
      onMouseLeave={() => {
        if (tiltRef.current) tiltRef.current.style.transform = "";
      }}
    >
      <div className="cover">
        <div className={`cover-bg ${game.cover}`} />
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{best ? best.toLocaleString("es-ES") : "—"}</b>
          </div>
          <span
            className={`btn ${game.color === "magenta" ? "magenta" : game.color === "yellow" ? "yellow" : ""}`}
          >
            JUGAR
          </span>
        </div>
      </div>
    </Link>
  );
}
