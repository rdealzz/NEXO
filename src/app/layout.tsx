import type { Metadata, Viewport } from "next";

import { BannerCookies } from "@/components/legal/banner-cookies";
import { SCRIPT_DO_TEMA } from "@/lib/tema";

import "./globals.css";

export const metadata: Metadata = {
  title: "NEXO — Joga aqui. Eu lembro.",
  description:
    "Jogue aqui qualquer coisa que não pode esquecer: uma foto, um áudio, um print, um PDF, um e-mail. O NEXO entende o que precisa acontecer e avisa você na hora certa.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NEXO", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icone.svg", type: "image/svg+xml" },
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// Uma cor só: o app abre claro. O script do tema troca esta meta quando a
// pessoa escolhe escuro.
export const viewport: Viewport = { themeColor: "#f7f7f5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased" data-tema="claro" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DO_TEMA }} />
        {children}
        <BannerCookies />
      </body>
    </html>
  );
}
