import type { Metadata } from "next";
import "./globals.css";
import "./arcade.css";
import { FontPreconnect } from "@/components/FontPreconnect";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Plataforma para jugar online y competir por puntos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <FontPreconnect />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Courier+Prime:wght@400;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <div className="av-bg"></div>
        <div className="av-noise"></div>
        <Nav />
        <main className="av-main">{children}</main>
        <footer
          style={{
            borderTop: "1px solid var(--line)",
            padding: "20px 32px",
            textAlign: "center",
            color: "var(--ink-faint)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
          }}
        >
          © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
        </footer>
      </body>
    </html>
  );
}
