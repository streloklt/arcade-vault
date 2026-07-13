"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { clearStoredUser, getStoredUserSnapshot, subscribeToUserChanges } from "@/lib/storage";

function getServerUserSnapshot() {
  return null;
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSyncExternalStore(subscribeToUserChanges, getStoredUserSnapshot, getServerUserSnapshot);
  const [open, setOpen] = useState(false);

  const isActive = (name: "home" | "biblioteca" | "salon" | "about" | "auth") => {
    if (name === "home") return pathname === "/";
    if (name === "biblioteca") return pathname.startsWith("/biblioteca") || pathname.startsWith("/juego");
    if (name === "salon") return pathname.startsWith("/salon");
    if (name === "about") return pathname.startsWith("/acerca-de");
    return pathname.startsWith("/auth");
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleSignOut = () => {
    clearStoredUser();
  };

  return (
    <>
      <nav className="av-nav">
        <div className="logo" onClick={() => go("/")}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </div>
        <div className="links">
          <Link href="/" className={isActive("home") ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={isActive("about") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <button className="btn auth-btn" onClick={() => go("/auth")}>
            Iniciar Sesión
          </button>
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
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <a className={isActive("home") ? "active" : ""} onClick={() => go("/")}>
          Inicio
        </a>
        <a className={isActive("biblioteca") ? "active" : ""} onClick={() => go("/biblioteca")}>
          Biblioteca
        </a>
        <a className={isActive("salon") ? "active" : ""} onClick={() => go("/salon")}>
          Salón de la Fama
        </a>
        <a className={isActive("about") ? "active" : ""} onClick={() => go("/acerca-de")}>
          Acerca de
        </a>
        <a className={isActive("auth") ? "active" : ""} onClick={() => go("/auth")}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </a>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
