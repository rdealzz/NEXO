import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "NEXO — Joga aqui. Eu lembro.",
  description:
    "Jogue aqui qualquer coisa que não pode esquecer: uma foto, um áudio, um print, um PDF, um e-mail. O NEXO entende o que precisa acontecer e avisa você na hora certa.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NEXO", statusBarStyle: "default" },
  icons: { icon: "/icone.svg", apple: "/icone.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
