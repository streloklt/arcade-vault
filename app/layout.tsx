import type { Metadata } from "next";
import "./globals.css";
import "./arcade.css";
import { FontPreconnect } from "@/components/FontPreconnect";

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
