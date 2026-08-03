import type { WorkStage } from "@/types/revelar";

export const defaultStages = [
  "Orçamento",
  "Contrato",
  "Pagamento dos 50%",
  "Preparação",
  "Sessão",
  "Seleção",
  "Edição",
  "Pagamento completo",
  "Entrega",
];

export function stageChecklist(label: string, id: string) {
  const items: Record<string, string[]> = {
    Orçamento: ["Definir pacote", "Enviar orçamento ao cliente"],
    Contrato: ["Revisar dados", "Receber assinatura"],
    "Pagamento dos 50%": ["Conferir comprovante", "Confirmar recebimento"],
    Preparação: ["Alinhar referências", "Confirmar local e horário"],
    Sessão: ["Revisar equipamentos", "Realizar sessão"],
    Seleção: ["Enviar galeria", "Receber escolhas"],
    Edição: ["Editar seleção", "Revisar exportação"],
    "Pagamento completo": ["Conferir saldo", "Confirmar quitação"],
    Entrega: ["Preparar galeria final", "Enviar ao cliente"],
  };
  return (items[label] || ["Concluir tarefa"]).map((item, index) => ({
    id: `${id}-check-${index}`,
    label: item,
    done: false,
  }));
}

export function createStages(prefix: string, doneCount = 0): WorkStage[] {
  return defaultStages.map((label, index) => ({
    id: `${prefix}-${index}`,
    label,
    done: index < doneCount,
    responsible: "Maryana",
    checklist: stageChecklist(label, `${prefix}-${index}`).map((item) => ({
      ...item,
      done: index < doneCount,
    })),
    attachments: [],
  }));
}
