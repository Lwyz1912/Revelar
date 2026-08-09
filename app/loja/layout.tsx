import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loja Mary Fotografia · Revelar.",
  description: "Produtos, álbuns, presets e experiências de Mary Fotografia.",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
