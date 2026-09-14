"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

type Section = "biblioteca" | "salon" | "auth";

export function isActive(pathname: string, section: Section): boolean {
  if (section === "biblioteca")
    return pathname === "/" || pathname.startsWith("/games/");
  if (section === "salon") return pathname === "/leaderboard";
  return pathname === "/auth";
}

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo">
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link
            href="/"
            className={isActive(pathname, "biblioteca") ? "active" : ""}
          >
            Biblioteca
          </Link>
          <Link
            href="/leaderboard"
            className={isActive(pathname, "salon") ? "active" : ""}
          >
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={signOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div
        className={`av-mobile-backdrop${open ? " open" : ""}`}
        onClick={close}
      />
      <aside className={`av-mobile-panel${open ? " open" : ""}`} inert={!open}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link
          href="/"
          onClick={close}
          className={isActive(pathname, "biblioteca") ? "active" : ""}
        >
          Biblioteca
        </Link>
        <Link
          href="/leaderboard"
          onClick={close}
          className={isActive(pathname, "salon") ? "active" : ""}
        >
          Salón de la Fama
        </Link>
        <Link
          href="/auth"
          onClick={close}
          className={isActive(pathname, "auth") ? "active" : ""}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
