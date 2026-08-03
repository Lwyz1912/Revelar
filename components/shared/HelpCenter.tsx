"use client";

import { useEffect, useRef } from "react";

import { sectionGuides } from "@/config/help";
import type { AvailableSection } from "@/types/revelar";

type HelpCenterProps = {
  activeSection: AvailableSection;
  onClose: () => void;
  onNavigate: (section: AvailableSection) => void;
};

const workflow: Array<{ section: AvailableSection; label: string; detail: string }> = [
  { section: "Clientes", label: "Cliente", detail: "quem contratou" },
  { section: "Orçamentos", label: "Proposta", detail: "o que foi combinado" },
  { section: "Trabalhos", label: "Produção", detail: "execução e entrega" },
  { section: "Financeiro", label: "Dinheiro", detail: "entradas e custos" },
];

export function HelpCenter({ activeSection, onClose, onNavigate }: HelpCenterProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const guide = sectionGuides[activeSection];

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop help-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="help-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-center-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p>GUIA DO REVELAR.</p>
            <h2 id="help-center-title">Como usar {activeSection}</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Fechar ajuda">
            ×
          </button>
        </header>

        <div className="help-center-body">
          <section className="help-purpose">
            <span aria-hidden="true">?</span>
            <p>{guide.purpose}</p>
          </section>

          <section className="help-section" aria-labelledby="help-steps-title">
            <p>PASSO A PASSO</p>
            <h3 id="help-steps-title">O caminho mais simples</h3>
            <ol>
              {guide.steps.map((step, index) => (
                <li key={step}>
                  <b>{index + 1}</b>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="help-section" aria-labelledby="help-flow-title">
            <p>FLUXO PRINCIPAL</p>
            <h3 id="help-flow-title">Como as áreas se conectam</h3>
            <div className="help-workflow">
              {workflow.map((item, index) => (
                <div key={item.section}>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(item.section);
                      onClose();
                    }}
                  >
                    <b>{item.label}</b>
                    <small>{item.detail}</small>
                  </button>
                  {index < workflow.length - 1 && <span aria-hidden="true">→</span>}
                </div>
              ))}
            </div>
            <small className="help-alternative">
              Produto com preço definido pode ser vendido diretamente; “sob consulta” segue para
              Orçamentos.
            </small>
          </section>

          <aside className="help-tip">
            <strong>Dica desta área</strong>
            <span>{guide.tip}</span>
          </aside>
        </div>

        <footer>
          {activeSection !== "Visão geral" && (
            <button type="button" className="text-button" onClick={() => onNavigate("Visão geral")}>
              Voltar ao início
            </button>
          )}
          <button type="button" className="primary-button" onClick={onClose}>
            Entendi
          </button>
        </footer>
      </aside>
    </div>
  );
}
