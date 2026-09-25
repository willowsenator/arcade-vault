"use client";
import Link from "next/link";
import { useState } from "react";
import { GAMES, type ScoreRow } from "@/lib/data";
import { useAuth } from "@/components/AuthProvider";
import {
  NO_SCORES_YET,
  OWN_BEST_LOADING,
  OWN_BEST_LOAD_ERROR,
  noOwnBest,
} from "@/lib/messages";
import { useOwnBest, type OwnBestState } from "@/components/screens/useOwnBest";

const rankLabel = (rank: number) => `#${String(rank).padStart(2, "0")}`;

function OwnBestRow({
  own,
  gameTitle,
  userName,
  rowCount,
}: {
  own: OwnBestState;
  gameTitle: string;
  userName: string;
  rowCount: number;
}) {
  if (own.status === "error") return <div className="tr you">{OWN_BEST_LOAD_ERROR}</div>;
  if (own.status !== "ready") return <div className="tr you">{OWN_BEST_LOADING}</div>;
  if (!own.best) return <div className="tr you">{noOwnBest(gameTitle)}</div>;
  return (
    <div className="tr you" style={{ animationDelay: `${rowCount * 50 + 50}ms` }}>
      <div className="rk" style={{ color: "var(--yellow)" }}>
        {rankLabel(own.best.rank)}
      </div>
      <div className="pl" style={{ color: "var(--yellow)" }}>
        {userName}
      </div>
      <div
        className="sc"
        style={{
          color: "var(--yellow)",
          textShadow: "0 0 6px rgba(245,255,0,0.5)",
        }}
      >
        {own.best.score.toLocaleString("es-ES")}
      </div>
      <div className="dt">{own.best.date}</div>
    </div>
  );
}

export default function LeaderboardScreen({
  topByGame,
}: {
  topByGame: Record<string, ScoreRow[]>;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = topByGame[tab] ?? [];
  const game = GAMES.find((candidate) => candidate.id === tab)!;
  const own = useOwnBest(tab, user?.name ?? null);
  const [gold, silver, bronze] = rows;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {GAMES.map((candidate) => (
          <button
            key={candidate.id}
            className={`chip${tab === candidate.id ? " active" : ""}`}
            onClick={() => setTab(candidate.id)}
          >
            {candidate.title}
          </button>
        ))}
      </div>
      {rows.length === 0 && <div>{NO_SCORES_YET}</div>}
      {rows.length > 0 && (
        <div className="podium">
          {silver && (
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{silver.name}</div>
              <div className="score">{silver.score.toLocaleString("es-ES")}</div>
              <div className="date">{silver.date}</div>
            </div>
          )}
          <div className="podium-slot gold">
            <div
              className="pixel"
              style={{
                fontSize: 9,
                color: "var(--gold)",
                letterSpacing: "0.18em",
              }}
            >
              CAMPEÓN
            </div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
              01
            </div>
            <div className="name">{gold.name}</div>
            <div className="score" style={{ fontSize: 20 }}>
              {gold.score.toLocaleString("es-ES")}
            </div>
            <div className="date">{gold.date}</div>
          </div>
          {bronze && (
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{bronze.name}</div>
              <div className="score">{bronze.score.toLocaleString("es-ES")}</div>
              <div className="date">{bronze.date}</div>
            </div>
          )}
        </div>
      )}
      {(rows.length > 0 || user) && (
        <div className="hall-table">
          {rows.length > 0 && (
            <>
              <div className="th">
                <div>RANGO</div>
                <div>JUGADOR</div>
                <div>PUNTUACIÓN</div>
                <div>FECHA</div>
              </div>
              {rows.map((row, index) => (
                <div
                  key={`${row.name}${index}`}
                  className={`tr${index === 0 ? " top1" : index === 1 ? " top2" : index === 2 ? " top3" : ""}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="rk">{rankLabel(row.rank)}</div>
                  <div className="pl">{row.name}</div>
                  <div className="sc">{row.score.toLocaleString("es-ES")}</div>
                  <div className="dt">{row.date}</div>
                </div>
              ))}
            </>
          )}
          {user && (
            <>
              <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
              <OwnBestRow
                own={own}
                gameTitle={game.title}
                userName={user.name}
                rowCount={rows.length}
              />
            </>
          )}
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
