import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from "react";

import { convertMoney, summarizeTransactions, workTransactions } from "@/lib/finance";
import { todayIso } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import type {
  Currency,
  FinanceScope,
  FinanceTransaction,
  TransactionStatus,
  TransactionType,
  Work,
} from "@/types/revelar";
import { useUrlStringState } from "@/hooks/use-url-state";

const financeScopes = ["all", "professional", "personal"] as const;
const transactionKinds = ["all", "income", "expense", "transfer"] as const;

export function FinancialView({
  works,
  transactions,
  setTransactions,
  currency,
  setCurrency,
  onOpenWork,
  toast,
}: {
  works: Work[];
  transactions: FinanceTransaction[];
  setTransactions: Dispatch<SetStateAction<FinanceTransaction[]>>;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  onOpenWork: (work: Work) => void;
  toast: (message: string) => void;
}) {
  const today = todayIso();
  const [scope, setScope] = useUrlStringState<"all" | FinanceScope>(
    "financeScope",
    "all",
    financeScopes,
  );
  const [kind, setKind] = useUrlStringState<"all" | TransactionType>(
    "financeKind",
    "all",
    transactionKinds,
  );
  const [newOpen, setNewOpen] = useState(false);
  const [showConversion, setShowConversion] = useState(false);
  const [eurRate, setEurRate] = useState(6.35);
  const [draft, setDraft] = useState<Omit<FinanceTransaction, "id">>({
    type: "expense",
    scope: "professional",
    description: "",
    amount: 0,
    currency,
    date: today,
    category: "Equipamento",
    tags: [],
    account: "Conta principal",
    paymentMethod: "Pix / transferência",
    status: "paid",
    origin: "Lançamento avulso",
  });

  const linked = useMemo(() => workTransactions(works), [works]);
  const allTransactions = useMemo(() => [...transactions, ...linked], [transactions, linked]);
  const visible = allTransactions.filter(
    (item) =>
      item.currency === currency &&
      (scope === "all" || item.scope === scope) &&
      (kind === "all" || item.type === kind),
  );
  const { received, expenses, pending, balance } = summarizeTransactions(visible);
  const converted = convertMoney(balance, currency, eurRate);
  const maxFlow = Math.max(received, expenses, pending, 1);

  const addTransaction = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.description.trim() || draft.amount <= 0) return;
    setTransactions((current) => [
      {
        ...draft,
        id: `tx-${Date.now()}`,
        tags: draft.tags.filter(Boolean),
        destinationAccount: draft.type === "transfer" ? draft.destinationAccount : undefined,
      },
      ...current,
    ]);
    setNewOpen(false);
    setDraft({
      type: "expense",
      scope: "professional",
      description: "",
      amount: 0,
      currency,
      date: today,
      category: "Equipamento",
      tags: [],
      account: "Conta principal",
      paymentMethod: "Pix / transferência",
      status: "paid",
      origin: "Lançamento avulso",
    });
    toast("Lançamento adicionado ao financeiro");
  };

  return (
    <div className="finance-page">
      <section className="finance-title-row">
        <div>
          <p>GESTÃO FINANCEIRA COMPLETA</p>
          <h1>Financeiro</h1>
          <span>
            Vida pessoal e profissional separadas, com visão combinada quando você quiser.
          </span>
        </div>
        <div className="finance-title-actions">
          <div className="currency-switch">
            <button
              type="button"
              className={currency === "BRL" ? "active" : ""}
              onClick={() => setCurrency("BRL")}
            >
              BRL · R$
            </button>
            <button
              type="button"
              className={currency === "EUR" ? "active" : ""}
              onClick={() => setCurrency("EUR")}
            >
              EUR · €
            </button>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setDraft((current) => ({ ...current, currency }));
              setNewOpen(true);
            }}
          >
            ＋ Lançamento
          </button>
        </div>
      </section>

      <section className="finance-control-row">
        <div className="finance-tabs">
          <button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>
            Visão geral
          </button>
          <button
            className={scope === "professional" ? "active" : ""}
            onClick={() => setScope("professional")}
          >
            Profissional
          </button>
          <button
            className={scope === "personal" ? "active" : ""}
            onClick={() => setScope("personal")}
          >
            Pessoal
          </button>
        </div>
        <div className="finance-tabs compact">
          <button className={kind === "all" ? "active" : ""} onClick={() => setKind("all")}>
            Tudo
          </button>
          <button className={kind === "income" ? "active" : ""} onClick={() => setKind("income")}>
            Entradas
          </button>
          <button className={kind === "expense" ? "active" : ""} onClick={() => setKind("expense")}>
            Saídas
          </button>
          <button
            className={kind === "transfer" ? "active" : ""}
            onClick={() => setKind("transfer")}
          >
            Transferências
          </button>
        </div>
      </section>

      <section className="finance-metrics">
        <article>
          <img src="/brand/revelar-icons-svg-monocromatico/11-entrega.svg" alt="" />
          <span>ENTRADAS RECEBIDAS</span>
          <strong>{formatMoney(received, currency)}</strong>
          <small>{visible.filter((item) => item.type === "income").length} recebimentos</small>
        </article>
        <article>
          <img src="/brand/revelar-icons-svg-monocromatico/07-custos.svg" alt="" />
          <span>SAÍDAS PAGAS</span>
          <strong>{formatMoney(expenses, currency)}</strong>
          <small>Custos e despesas</small>
        </article>
        <article>
          <img src="/brand/revelar-icons-svg-monocromatico/06-pagamentos.svg" alt="" />
          <span>PENDENTE / ATRASADO</span>
          <strong>{formatMoney(pending, currency)}</strong>
          <small>Valores para acompanhar</small>
        </article>
        <article>
          <img src="/brand/revelar-icons-svg-monocromatico/06-pagamentos.svg" alt="" />
          <span>SALDO DO PERÍODO</span>
          <strong>{formatMoney(balance, currency)}</strong>
          <small>Transferências não alteram o saldo</small>
        </article>
      </section>

      <section className="finance-layout">
        <article className="card finance-overview-card">
          <div className="card-heading">
            <div>
              <p>ORIGEM E DESTINO</p>
              <h2>Fluxo detalhado</h2>
              <span>Entradas e saídas filtradas nesta visão</span>
            </div>
          </div>
          <div className="finance-bars">
            {[
              { label: "Entradas", value: received, tone: "primary" },
              { label: "Saídas", value: expenses, tone: "rose" },
              { label: "Pendentes", value: pending, tone: "accent" },
            ].map((item) => (
              <div key={item.label}>
                <span>
                  <b>{item.label}</b>
                  <strong>{formatMoney(item.value, currency)}</strong>
                </span>
                <i>
                  <em
                    className={item.tone}
                    style={{ width: `${Math.max(3, (item.value / maxFlow) * 100)}%` }}
                  />
                </i>
              </div>
            ))}
          </div>
        </article>
        <article className="card exchange-card">
          <div className="card-heading">
            <div>
              <p>CONVERSÃO OPCIONAL</p>
              <h2>Real ↔ Euro</h2>
            </div>
          </div>
          <label className="exchange-toggle">
            <input
              type="checkbox"
              checked={showConversion}
              onChange={(event) => setShowConversion(event.target.checked)}
            />
            <span>Mostrar valor convertido</span>
          </label>
          <label className="field">
            <span>1 EUR vale quantos BRL?</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={eurRate}
              onChange={(event) => setEurRate(Number(event.target.value) || 1)}
            />
          </label>
          {showConversion && (
            <div className="converted-balance">
              <small>SALDO CONVERTIDO</small>
              <strong>{formatMoney(converted, currency === "BRL" ? "EUR" : "BRL")}</strong>
              <span>Taxa configurável, sem misturar os saldos.</span>
            </div>
          )}
        </article>
      </section>

      <section className="finance-ledger card">
        <div className="card-heading compact">
          <div>
            <p>EXTRATO DETALHADO</p>
            <h2>De onde veio e para onde foi</h2>
          </div>
          <span>{visible.length} movimentações</span>
        </div>
        <div className="ledger-head">
          <span>Data e descrição</span>
          <span>Origem / destino</span>
          <span>Categoria e tags</span>
          <span>Conta e método</span>
          <span>Valor</span>
        </div>
        {visible.map((item) => (
          <button
            type="button"
            key={item.id}
            className={item.workId ? "linked" : undefined}
            onClick={() => {
              const linkedWork = works.find((work) => work.id === item.workId);
              if (linkedWork) onOpenWork(linkedWork);
            }}
          >
            <span>
              <i className={`money-dot ${item.type}`} />{" "}
              <span>
                <strong>{item.description}</strong>
                <small>
                  {formatDate(item.date)} ·{" "}
                  {item.scope === "professional" ? "Profissional" : "Pessoal"}
                </small>
              </span>
            </span>
            <span>
              <strong>{item.origin}</strong>
              <small>
                {item.type === "transfer"
                  ? `Para ${item.destinationAccount}`
                  : item.type === "income"
                    ? "Entrada"
                    : "Saída"}
              </small>
            </span>
            <span>
              <strong>{item.category}</strong>
              <small>
                {item.tags.length ? item.tags.map((tag) => `#${tag}`).join(" ") : "Sem tags"}
              </small>
            </span>
            <span>
              <strong>{item.account}</strong>
              <small>{item.paymentMethod}</small>
            </span>
            <span className={`ledger-value ${item.type}`}>
              {item.type === "expense" ? "−" : item.type === "income" ? "+" : "↔"}{" "}
              {formatMoney(item.amount, item.currency)}
              <small>
                {item.status === "received"
                  ? "Recebido"
                  : item.status === "paid"
                    ? "Pago"
                    : item.status === "late"
                      ? "Atrasado"
                      : "Pendente"}
              </small>
            </span>
          </button>
        ))}
        {visible.length === 0 && (
          <div className="finance-empty">
            <p>Nenhuma movimentação encontrada nesta visão.</p>
          </div>
        )}
      </section>

      {newOpen && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={() => setNewOpen(false)}>
          <aside
            className="client-drawer finance-drawer"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p>NOVO LANÇAMENTO</p>
                <h2>Registrar movimentação</h2>
                <span>Pode ser pessoal, profissional ou uma transferência.</span>
              </div>
              <button type="button" onClick={() => setNewOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={addTransaction}>
              <div className="drawer-body">
                <div className="transaction-kind">
                  {(["income", "expense", "transfer"] as TransactionType[]).map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={draft.type === type ? "active" : ""}
                      onClick={() => setDraft({ ...draft, type })}
                    >
                      {type === "income"
                        ? "＋ Entrada"
                        : type === "expense"
                          ? "− Saída"
                          : "↔ Transferência"}
                    </button>
                  ))}
                </div>
                <div className="field-grid">
                  <label className="field full">
                    <span>Descrição *</span>
                    <input
                      required
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      placeholder="Ex.: aluguel do estúdio ou venda de preset"
                    />
                  </label>
                  <label className="field">
                    <span>Área</span>
                    <select
                      value={draft.scope}
                      onChange={(event) =>
                        setDraft({ ...draft, scope: event.target.value as FinanceScope })
                      }
                    >
                      <option value="professional">Profissional</option>
                      <option value="personal">Pessoal</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Data</span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Moeda</span>
                    <select
                      value={draft.currency}
                      onChange={(event) =>
                        setDraft({ ...draft, currency: event.target.value as Currency })
                      }
                    >
                      <option value="BRL">Real</option>
                      <option value="EUR">Euro</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Valor *</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={draft.amount || ""}
                      onChange={(event) =>
                        setDraft({ ...draft, amount: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Categoria</span>
                    <input
                      list="finance-categories"
                      value={draft.category}
                      onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                    />
                    <datalist id="finance-categories">
                      <option value="Transporte" />
                      <option value="Equipamento" />
                      <option value="Alimentação" />
                      <option value="Aluguel" />
                      <option value="Lazer" />
                      <option value="Cliente" />
                      <option value="Curso" />
                      <option value="Produto digital" />
                    </datalist>
                  </label>
                  <label className="field">
                    <span>Tags</span>
                    <input
                      value={draft.tags.join(", ")}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tags: event.target.value.split(",").map((tag) => tag.trim()),
                        })
                      }
                      placeholder="estúdio, recorrente"
                    />
                  </label>
                  <label className="field">
                    <span>Conta / carteira</span>
                    <input
                      value={draft.account}
                      onChange={(event) => setDraft({ ...draft, account: event.target.value })}
                    />
                  </label>
                  {draft.type === "transfer" && (
                    <label className="field">
                      <span>Conta de destino</span>
                      <input
                        value={draft.destinationAccount || ""}
                        onChange={(event) =>
                          setDraft({ ...draft, destinationAccount: event.target.value })
                        }
                      />
                    </label>
                  )}
                  <label className="field">
                    <span>Forma de pagamento</span>
                    <select
                      value={draft.paymentMethod}
                      onChange={(event) =>
                        setDraft({ ...draft, paymentMethod: event.target.value })
                      }
                    >
                      <option>Pix / transferência</option>
                      <option>Cartão de crédito</option>
                      <option>Cartão de débito</option>
                      <option>Dinheiro</option>
                      <option>Débito automático</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Situação</span>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDraft({ ...draft, status: event.target.value as TransactionStatus })
                      }
                    >
                      <option value={draft.type === "income" ? "received" : "paid"}>
                        {draft.type === "income" ? "Recebido" : "Pago"}
                      </option>
                      <option value="pending">Pendente</option>
                      <option value="late">Atrasado</option>
                    </select>
                  </label>
                  <label className="field full">
                    <span>Origem / referência</span>
                    <input
                      value={draft.origin}
                      onChange={(event) => setDraft({ ...draft, origin: event.target.value })}
                      placeholder="Cliente, loja, salário, casa..."
                    />
                  </label>
                </div>
              </div>
              <div className="drawer-footer">
                <button className="cancel-button" type="button" onClick={() => setNewOpen(false)}>
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  Salvar lançamento
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
