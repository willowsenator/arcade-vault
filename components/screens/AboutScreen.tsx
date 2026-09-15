"use client";

import { useEffect, useState, type FormEvent } from "react";

function useReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function HighlightIcon({ kind }: { kind: "HEART" | "BROWSER" | "PLANT" }) {
  const c = "currentColor";
  if (kind === "HEART")
    return (
      <svg className="hl-icon" viewBox="0 0 16 16">
        <g fill={c}>
          <rect x="2" y="3" width="4" height="2" />
          <rect x="10" y="3" width="4" height="2" />
          <rect x="1" y="4" width="2" height="4" />
          <rect x="13" y="4" width="2" height="4" />
          <rect x="2" y="8" width="2" height="2" />
          <rect x="12" y="8" width="2" height="2" />
          <rect x="3" y="9" width="10" height="2" />
          <rect x="4" y="11" width="8" height="2" />
          <rect x="5" y="12" width="6" height="2" />
          <rect x="6" y="13" width="4" height="1" />
          <rect x="7" y="14" width="2" height="1" />
        </g>
      </svg>
    );
  if (kind === "BROWSER")
    return (
      <svg className="hl-icon" viewBox="0 0 16 16">
        <g fill={c}>
          <rect x="1" y="2" width="14" height="12" fill="none" stroke={c} strokeWidth="1.4" />
          <rect x="1" y="2" width="14" height="3" />
          <rect x="3" y="3" width="1" height="1" fill="#0a0a0f" />
          <rect x="5" y="3" width="1" height="1" fill="#0a0a0f" />
          <rect x="7" y="3" width="1" height="1" fill="#0a0a0f" />
          <rect x="3" y="7" width="4" height="1" />
          <rect x="3" y="9" width="6" height="1" />
          <rect x="3" y="11" width="3" height="1" />
        </g>
      </svg>
    );
  return (
    <svg className="hl-icon" viewBox="0 0 16 16">
      <g fill={c}>
        <rect x="7" y="2" width="2" height="10" />
        <rect x="4" y="4" width="3" height="2" />
        <rect x="9" y="6" width="3" height="2" />
        <rect x="3" y="3" width="2" height="2" />
        <rect x="11" y="5" width="2" height="2" />
        <rect x="3" y="12" width="10" height="2" />
        <rect x="4" y="14" width="8" height="1" />
      </g>
    </svg>
  );
}

const HIGHLIGHTS = [
  { kind: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  {
    kind: "BROWSER",
    text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR",
    color: "cyan",
  },
  { kind: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
] as const;

type ContactForm = { name: string; email: string; msg: string };

const EMPTY_FORM: ContactForm = { name: "", email: "", msg: "" };

export default function AboutScreen() {
  useReveal();
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setSent(form.name.trim());
  };

  return (
    <div className="about fade-in">
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra
          misión es preservar y celebrar los arcades que definieron una
          generación, haciéndolos accesibles para todos, en cualquier lugar y
          sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((highlight, index) => (
            <div
              key={highlight.text}
              className={`highlight ${highlight.color}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <HighlightIcon kind={highlight.kind} />
              <div className="hl-text pixel">{highlight.text}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar" />
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, index) => (
            <span key={index} style={{ animationDelay: `${index * 80}ms` }} />
          ))}
        </div>
        <div className="div-bar" />
      </div>

      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o
              simplemente quieres saludar? Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led" />
                RESPUESTA EN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y" />
                SUGERENCIAS BIENVENIDAS
              </div>
              <div className="tip">
                <span className="tip-led m" />
                SIN SPAM, JAMÁS
              </div>
            </div>
          </div>

          <form
            className={`contact-form${shake ? " shake" : ""}`}
            onSubmit={onSubmit}
          >
            {!sent ? (
              <>
                <div className="field">
                  <label htmlFor="contact-name">NOMBRE</label>
                  <input
                    id="contact-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="px_kai"
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="jugador@vault.gg"
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-msg">MENSAJE</label>
                  <textarea
                    id="contact-msg"
                    rows={5}
                    value={form.msg}
                    onChange={(event) =>
                      setForm({ ...form, msg: event.target.value })
                    }
                    placeholder="Cuéntanos qué tienes en mente…"
                  />
                </div>
                <button
                  className="btn xl press"
                  type="submit"
                  style={{ width: "100%" }}
                >
                  ▶ ENVIAR MENSAJE
                </button>
              </>
            ) : (
              <div className="terminal-success">
                <div className="term-bar">
                  <span className="dot r" />
                  <span className="dot y" />
                  <span className="dot g" />
                  <span className="term-title">VAULT-OS // TERMINAL</span>
                </div>
                <div className="term-body">
                  <div className="line">
                    <span className="prompt">vault@arcade:~$</span>{` `}
                    ./send_message --to=team
                  </div>
                  <div className="line dim">[OK] Conectando con servidor…</div>
                  <div className="line dim">[OK] Validando contenido…</div>
                  <div className="line dim">[OK] Transmitiendo paquete…</div>
                  <div className="line success">
                    &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{` `}
                    {sent.toUpperCase()}.<span className="caret">_</span>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setSent(null);
                        setForm(EMPTY_FORM);
                      }}
                    >
                      ENVIAR OTRO MENSAJE
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
