"use client";

import { useState } from "react";

import { navItems } from "@/config/navigation";
import type { AppSection } from "@/types/revelar";

type MobileNavigationProps = {
  activeNav: AppSection;
  onNavigate: (label: AppSection) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
};

const primaryItems = navItems.slice(0, 4);
const managementItems = navItems.slice(4).filter((item) => item.available);

export function MobileNavigation({
  activeNav,
  onNavigate,
  onOpenHelp,
  onOpenSettings,
}: MobileNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const managementActive = managementItems.some((item) => item.label === activeNav);

  const navigate = (label: AppSection) => {
    setMoreOpen(false);
    onNavigate(label);
  };

  return (
    <>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        {primaryItems.map((item) => (
          <button
            type="button"
            key={item.label}
            className={activeNav === item.label ? "active" : ""}
            onClick={() => navigate(item.label)}
            aria-current={activeNav === item.label ? "page" : undefined}
          >
            <img src={item.icon} alt="" />
            {item.label === "Visão geral" ? "Início" : item.label}
          </button>
        ))}
        <button
          type="button"
          className={managementActive ? "active" : ""}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
        >
          <img src="/brand/revelar-icons-svg-monocromatico/13-configuracoes.svg" alt="" />
          Mais
        </button>
      </nav>

      {moreOpen && (
        <div
          className="drawer-backdrop mobile-more-backdrop"
          role="presentation"
          onMouseDown={() => setMoreOpen(false)}
        >
          <section
            className="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mais áreas do Revelar"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>GESTÃO</p>
                <h2>O que você quer organizar?</h2>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            <div className="mobile-more-grid">
              {managementItems.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  className={activeNav === item.label ? "active" : ""}
                  onClick={() => navigate(item.label)}
                  aria-current={activeNav === item.label ? "page" : undefined}
                >
                  <img src={item.icon} alt="" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>
                      {item.label === "Financeiro"
                        ? "Entradas, saídas e saldos"
                        : item.label === "Produtos"
                          ? "Catálogo e vendas"
                          : item.label === "Orçamentos"
                            ? "Propostas para clientes"
                            : "Documentos e assinaturas"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <button
              className="mobile-settings-link"
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onOpenHelp();
              }}
            >
              <span className="help-glyph" aria-hidden="true">
                ?
              </span>
              Como usar esta área
            </button>
            <button
              className="mobile-settings-link secondary"
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onOpenSettings();
              }}
            >
              <img src="/brand/revelar-icons-svg-monocromatico/13-configuracoes.svg" alt="" />
              Aparência e configurações
            </button>
          </section>
        </div>
      )}
    </>
  );
}
