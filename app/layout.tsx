import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Revelar. — Gestão para fotógrafos",
  description: "Dashboard inteligente para organizar clientes, ensaios, entregas e financeiro.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/brand/revelar-symbol.svg",
    shortcut: "/brand/revelar-symbol.svg",
    apple: "/brand/revelar-symbol.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
