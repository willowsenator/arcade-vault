"use client";

import { useMemo, useState } from "react";
import { CATS, GAMES } from "@/lib/data";
import GameCard from "@/components/GameCard";
import type { GameStats } from "@/lib/score-queries";

export default function LibraryScreen({
  stats,
}: {
  stats: Record<string, GameStats>;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("TODOS");
  const filtered = useMemo(
    () =>
      GAMES.filter(
        (game) =>
          (cat === "TODOS" || game.cat === cat) &&
          game.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, cat],
  );
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {CATS.map((category) => (
            <button
              key={category}
              className={`chip${cat === category ? " active" : ""}`}
              onClick={() => setCat(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="av-grid">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} best={stats[game.id]?.best ?? null} />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{
                fontSize: 14,
                color: "var(--magenta)",
                marginBottom: 12,
              }}
            >
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </div>
  );
}
