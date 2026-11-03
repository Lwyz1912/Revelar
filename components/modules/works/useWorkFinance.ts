import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { ShowToast } from "@/hooks/use-toast";
import type { Work, WorkCost, WorkIncome } from "@/types/revelar";

type WorkFinanceView = "summary" | "income" | "costs";

export function useWorkFinance({
  work,
  update,
  addActivity,
  toast,
}: {
  work: Work;
  update: (changes: Partial<Work>) => void;
  addActivity: (title: string, icon?: string) => void;
  toast: ShowToast;
}) {
  const [incomeDraft, setIncomeDraft] = useState({
    name: "Pagamento do cliente",
    category: "Pagamento" as WorkIncome["category"],
    tags: "",
    amount: 0,
    status: "received" as WorkIncome["status"],
    date: work.date,
  });
  const [costDraft, setCostDraft] = useState({
    name: "",
    category: "Transporte",
    tags: "",
    amount: 0,
    status: "planned" as WorkCost["status"],
    date: work.date,
  });
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [financeView, setFinanceView] = useState<WorkFinanceView>("summary");
  const costItems: WorkCost[] = work.costItems?.length
    ? work.costItems
    : work.costs > 0
      ? [
          {
            id: `legacy-${work.id}`,
            name: "Custos anteriores",
            category: "Produção",
            tags: [work.category],
            amount: work.costs,
            status: "planned",
            date: work.date,
          },
        ]
      : [];
  const incomeItems: WorkIncome[] = work.incomeItems?.length
    ? work.incomeItems
    : work.entryValue > 0
      ? [
          {
            id: `legacy-income-${work.id}`,
            name: "Pagamentos recebidos",
            category: "Pagamento",
            tags: [work.category],
            amount: work.entryValue,
            status: "received",
            date: work.date,
            countsTowardContract: true,
          },
        ]
      : [];
  const receivedIncome = incomeItems
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + item.amount, 0);
  const paidCosts = costItems
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0);
  const receivedPercent = work.totalValue
    ? Math.min(100, Math.round((work.entryValue / work.totalValue) * 100))
    : 0;
  const addIncome = () => {
    if (!incomeDraft.name.trim() || incomeDraft.amount <= 0) return;
    const countsTowardContract = incomeDraft.category === "Pagamento";
    const item: WorkIncome = {
      id: editingIncomeId || `income-${Date.now()}`,
      name: incomeDraft.name.trim(),
      category: incomeDraft.category,
      tags: incomeDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      amount: incomeDraft.amount,
      status: incomeDraft.status,
      date: incomeDraft.date || work.date,
      countsTowardContract,
    };
    const next = editingIncomeId
      ? incomeItems.map((income) => (income.id === editingIncomeId ? item : income))
      : [...incomeItems, item];
    const contractReceived = Math.min(
      work.totalValue,
      next
        .filter((income) => income.status === "received" && income.countsTowardContract)
        .reduce((sum, income) => sum + income.amount, 0),
    );
    try {
      update({ incomeItems: next, entryValue: contractReceived });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível salvar a receita", "error");
      return;
    }
    setEditingIncomeId(null);
    setIncomeDraft({
      name: "Pagamento do cliente",
      category: "Pagamento",
      tags: "",
      amount: 0,
      status: "received",
      date: work.date,
    });
    addActivity(`${item.category} de ${formatMoney(item.amount, work.currency)} registrada`, "＄");
    toast(
      item.category === "Gorjeta"
        ? "Gorjeta registrada como ganho extra"
        : "Receita salva neste navegador",
    );
  };
  const removeIncome = (id: string) => {
    const removed = incomeItems.find((item) => item.id === id);
    const next = incomeItems.filter((item) => item.id !== id);
    const nextContractReceived = next
      .filter((item) => item.countsTowardContract && item.status === "received")
      .reduce((sum, item) => sum + item.amount, 0);
    update({
      incomeItems: next,
      entryValue: removed?.countsTowardContract
        ? Math.min(work.totalValue, nextContractReceived)
        : work.entryValue,
    });
  };
  const editIncome = (item: WorkIncome) => {
    setEditingIncomeId(item.id);
    setIncomeDraft({
      name: item.name,
      category: item.category,
      tags: item.tags.join(", "),
      amount: item.amount,
      status: item.status,
      date: item.date || work.date,
    });
  };
  const addCost = () => {
    if (!costDraft.name.trim() || costDraft.amount <= 0) return;
    const item: WorkCost = {
      id: editingCostId || `cost-${Date.now()}`,
      name: costDraft.name.trim(),
      category: costDraft.category || "Outros",
      tags: costDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      amount: costDraft.amount,
      status: costDraft.status,
      date: costDraft.date || work.date,
    };
    const next = editingCostId
      ? costItems.map((cost) => (cost.id === editingCostId ? item : cost))
      : [...costItems, item];
    update({ costItems: next, costs: next.reduce((sum, cost) => sum + cost.amount, 0) });
    setEditingCostId(null);
    setCostDraft({
      name: "",
      category: "Transporte",
      tags: "",
      amount: 0,
      status: "planned",
      date: work.date,
    });
    addActivity(`Custo “${item.name}” adicionado`, "−");
    toast("Custo detalhado e sincronizado com o Financeiro");
  };
  const removeCost = (id: string) => {
    const next = costItems.filter((item) => item.id !== id);
    update({ costItems: next, costs: next.reduce((sum, item) => sum + item.amount, 0) });
  };
  const editCost = (item: WorkCost) => {
    setEditingCostId(item.id);
    setCostDraft({
      name: item.name,
      category: item.category,
      tags: item.tags.join(", "),
      amount: item.amount,
      status: item.status,
      date: item.date || work.date,
    });
  };
  return {
    incomeDraft,
    setIncomeDraft,
    costDraft,
    setCostDraft,
    editingIncomeId,
    editingCostId,
    financeView,
    setFinanceView,
    costItems,
    incomeItems,
    receivedIncome,
    paidCosts,
    receivedPercent,
    addIncome,
    removeIncome,
    editIncome,
    addCost,
    removeCost,
    editCost,
  };
}
