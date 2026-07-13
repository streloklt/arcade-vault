"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { clearStoredUser, getStoredUser, subscribeToUserChanges } from "@/lib/storage";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    return subscribeToUserChanges(() => setUser(getStoredUser()));
  }, []);

  const isActive = (name: "biblioteca" | "salon" | "auth") => {
    if (name === "biblioteca") return pathname === "/" || pathname.startsWith("/juego");
    if (name === "salon") return pathname.startsWith("/salon");
    return pathname.startsWith("/auth");
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleSignOut = () => {
    clearStoredUser();
    setUser(null);
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
          <Link href="/" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
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
        <a className={isActive("biblioteca") ? "active" : ""} onClick={() => go("/")}>
          Biblioteca
        </a>
        <a className={isActive("salon") ? "active" : ""} onClick={() => go("/salon")}>
          Salón de la Fama
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
