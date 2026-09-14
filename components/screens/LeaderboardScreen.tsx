"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GAMES, seededScores } from "@/lib/data";
import { useAuth } from "@/components/AuthProvider";
export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const game = GAMES.find((candidate) => candidate.id === tab)!;
  const youRank = user ? Math.floor(8 + (tab.length % 4)) : null;
  const youScore = user ? rows[5]?.score - 2400 : null;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel">LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
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
      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1].name}</div>
          <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
        </div>
        <div className="podium-slot gold">
          <div>CAMPEÓN</div>
          <div className="rank-num">01</div>
          <div className="name">{rows[0].name}</div>
          <div className="score">{rows[0].score.toLocaleString("es-ES")}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2].name}</div>
          <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
        </div>
      </div>
      <div className="hall-table">
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
          >
            <div className="rk">#{String(row.rank).padStart(2, "0")}</div>
            <div className="pl">{row.name}</div>
            <div className="sc">{row.score.toLocaleString("es-ES")}</div>
            <div className="dt">{row.date}</div>
          </div>
        ))}
        {user && youRank !== null && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you">
              <div className="rk">#{String(youRank).padStart(2, "0")}</div>
              <div className="pl">{user.name}</div>
              <div className="sc">
                {(youScore || 9999).toLocaleString("es-ES")}
              </div>
              <div className="dt">11/05/2026</div>
            </div>
          </>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
