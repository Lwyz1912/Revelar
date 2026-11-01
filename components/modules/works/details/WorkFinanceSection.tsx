import { formatDate, formatMoney } from "@/lib/format";
import type { WorkCost, WorkIncome } from "@/types/revelar";
import type { WorkDetailsController } from "../useWorkDetailsController";

type Props = {
  state: Pick<
    WorkDetailsController,
    | "addCost"
    | "addIncome"
    | "costDraft"
    | "costItems"
    | "editCost"
    | "editIncome"
    | "editingCostId"
    | "editingIncomeId"
    | "financeView"
    | "incomeDraft"
    | "incomeItems"
    | "paidCosts"
    | "receivedIncome"
    | "receivedPercent"
    | "removeCost"
    | "removeIncome"
    | "setCostDraft"
    | "setFinanceView"
    | "setIncomeDraft"
    | "toggleStage"
    | "work"
  >;
};

export function WorkFinanceSection({ state }: Props) {
  const {
    addCost,
    addIncome,
    costDraft,
    costItems,
    editCost,
    editIncome,
    editingCostId,
    editingIncomeId,
    financeView,
    incomeDraft,
    incomeItems,
    paidCosts,
    receivedIncome,
    receivedPercent,
    removeCost,
    removeIncome,
    setCostDraft,
    setFinanceView,
    setIncomeDraft,
    toggleStage,
    work,
  } = state;
  return (
    <section className="tab-single card finance-tab">
      <div className="detail-section-heading">
        <div>
          <p>FINANCEIRO DO TRABALHO</p>
          <h2>Recebimentos, ganhos e custos</h2>
        </div>
        <span>Sincronizado com o Financeiro geral</span>
      </div>
      <nav className="work-finance-nav" aria-label="Seções do financeiro">
        {(
          [
            ["summary", "Resumo"],
            ["income", "Recebimentos"],
            ["costs", "Custos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={financeView === id ? "active" : ""}
            onClick={() => setFinanceView(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="work-finance-summary">
        <article>
          <span>CONTRATADO</span>
          <strong>{formatMoney(work.totalValue, work.currency)}</strong>
          <small>{work.packageName}</small>
        </article>
        <article>
          <span>PAGO PELO CLIENTE</span>
          <strong>{formatMoney(work.entryValue, work.currency)}</strong>
          <small>{receivedPercent}% do contrato</small>
        </article>
        <article>
          <span>OUTROS GANHOS</span>
          <strong>
            {formatMoney(Math.max(0, receivedIncome - work.entryValue), work.currency)}
          </strong>
          <small>Gorjetas, adicionais e reembolsos</small>
        </article>
        <article className="result">
          <span>RESULTADO ATUAL</span>
          <strong>{formatMoney(receivedIncome - paidCosts, work.currency)}</strong>
          <small>Entradas recebidas menos custos pagos</small>
        </article>
      </div>

      {financeView === "income" && (
        <div className="work-finance-section finance-entry-focus">
          <div className="work-finance-section-heading">
            <div>
              <span>RECEBIMENTOS E GANHOS</span>
              <h3>Entradas deste trabalho</h3>
            </div>
            <small>{incomeItems.length} lançamento(s)</small>
          </div>
          <div className="income-entry-grid">
            <label className="field">
              <span>Descrição</span>
              <input
                value={incomeDraft.name}
                onChange={(event) => setIncomeDraft({ ...incomeDraft, name: event.target.value })}
                placeholder="Ex.: gorjeta da cliente"
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={incomeDraft.category}
                onChange={(event) =>
                  setIncomeDraft({
                    ...incomeDraft,
                    category: event.target.value as WorkIncome["category"],
                    name:
                      event.target.value === "Gorjeta" &&
                      incomeDraft.name === "Pagamento do cliente"
                        ? "Gorjeta da cliente"
                        : incomeDraft.name,
                  })
                }
              >
                {(["Pagamento", "Gorjeta", "Adicional", "Reembolso", "Outro"] as const).map(
                  (category) => (
                    <option key={category}>{category}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              <span>Tags</span>
              <input
                value={incomeDraft.tags}
                onChange={(event) => setIncomeDraft({ ...incomeDraft, tags: event.target.value })}
                placeholder="cliente, casamento"
              />
            </label>
            <label className="field">
              <span>Valor ({work.currency})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={incomeDraft.amount || ""}
                onChange={(event) =>
                  setIncomeDraft({ ...incomeDraft, amount: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span>Data</span>
              <input
                type="date"
                value={incomeDraft.date}
                onChange={(event) => setIncomeDraft({ ...incomeDraft, date: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Situação</span>
              <select
                value={incomeDraft.status}
                onChange={(event) =>
                  setIncomeDraft({
                    ...incomeDraft,
                    status: event.target.value as WorkIncome["status"],
                  })
                }
              >
                <option value="received">Recebido</option>
                <option value="pending">Pendente</option>
              </select>
            </label>
            <button className="primary-button" type="button" onClick={addIncome}>
              {editingIncomeId ? "✓ Salvar ganho" : "＋ Adicionar ganho"}
            </button>
          </div>
          <div className="work-money-list">
            {incomeItems.map((item) => (
              <article key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {formatDate(item.date)} · {item.category}
                    {item.tags.length ? ` · #${item.tags.join(" #")}` : ""}
                  </small>
                </span>
                <span className={`income-state ${item.status}`}>
                  {item.status === "received" ? "Recebido" : "Pendente"}
                </span>
                <strong>＋ {formatMoney(item.amount, work.currency)}</strong>
                <span className="money-row-actions">
                  <button
                    type="button"
                    onClick={() => editIncome(item)}
                    aria-label={`Editar ${item.name}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => removeIncome(item.id)}
                    aria-label={`Remover ${item.name}`}
                  >
                    ×
                  </button>
                </span>
              </article>
            ))}
            {incomeItems.length === 0 && <p>Nenhuma entrada registrada.</p>}
          </div>
        </div>
      )}

      {financeView === "costs" && (
        <div className="work-finance-section finance-entry-focus">
          <div className="work-finance-section-heading">
            <div>
              <span>CUSTOS</span>
              <h3>Gastos deste trabalho</h3>
            </div>
            <small>{formatMoney(work.costs, work.currency)} cadastrados</small>
          </div>
          <div className="cost-entry-grid compact-finance-entry">
            <label className="field">
              <span>Nome do custo</span>
              <input
                value={costDraft.name}
                onChange={(event) => setCostDraft({ ...costDraft, name: event.target.value })}
                placeholder="Ex.: combustível para o casamento"
              />
            </label>
            <label className="field">
              <span>Categoria</span>
              <input
                list="work-cost-categories"
                value={costDraft.category}
                onChange={(event) => setCostDraft({ ...costDraft, category: event.target.value })}
              />
              <datalist id="work-cost-categories">
                <option value="Transporte" />
                <option value="Equipamento" />
                <option value="Alimentação" />
                <option value="Aluguel" />
                <option value="Equipe" />
                <option value="Impressão" />
                <option value="Cliente" />
              </datalist>
            </label>
            <label className="field">
              <span>Tags</span>
              <input
                value={costDraft.tags}
                onChange={(event) => setCostDraft({ ...costDraft, tags: event.target.value })}
                placeholder="viagem, casamento"
              />
            </label>
            <label className="field">
              <span>Valor ({work.currency})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costDraft.amount || ""}
                onChange={(event) =>
                  setCostDraft({ ...costDraft, amount: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span>Data</span>
              <input
                type="date"
                value={costDraft.date}
                onChange={(event) => setCostDraft({ ...costDraft, date: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Situação</span>
              <select
                value={costDraft.status}
                onChange={(event) =>
                  setCostDraft({
                    ...costDraft,
                    status: event.target.value as WorkCost["status"],
                  })
                }
              >
                <option value="planned">Previsto</option>
                <option value="paid">Pago</option>
              </select>
            </label>
            <button className="primary-button" type="button" onClick={addCost}>
              {editingCostId ? "✓ Salvar custo" : "＋ Adicionar custo"}
            </button>
          </div>
          <div className="work-money-list costs-list">
            {costItems.map((item) => (
              <article key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {formatDate(item.date)} · {item.category}
                    {item.tags.length ? ` · #${item.tags.join(" #")}` : ""}
                  </small>
                </span>
                <span className={`cost-state ${item.status}`}>
                  {item.status === "paid" ? "Pago" : "Previsto"}
                </span>
                <strong>− {formatMoney(item.amount, work.currency)}</strong>
                <span className="money-row-actions">
                  <button
                    type="button"
                    onClick={() => editCost(item)}
                    aria-label={`Editar ${item.name}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCost(item.id)}
                    aria-label={`Remover ${item.name}`}
                  >
                    ×
                  </button>
                </span>
              </article>
            ))}
            {costItems.length === 0 && <p>Nenhum custo cadastrado.</p>}
          </div>
        </div>
      )}

      {financeView === "summary" && (
        <>
          <div className="finance-summary-ledgers">
            <section>
              <header>
                <span>ÚLTIMAS ENTRADAS</span>
                <button type="button" onClick={() => setFinanceView("income")}>
                  Ver todas
                </button>
              </header>
              {incomeItems
                .slice(-3)
                .reverse()
                .map((item) => (
                  <div key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {formatDate(item.date)} · {item.category}
                      </small>
                    </span>
                    <b>＋ {formatMoney(item.amount, work.currency)}</b>
                  </div>
                ))}
              {incomeItems.length === 0 && <p>Nenhuma entrada registrada.</p>}
            </section>
            <section>
              <header>
                <span>ÚLTIMOS CUSTOS</span>
                <button type="button" onClick={() => setFinanceView("costs")}>
                  Ver todos
                </button>
              </header>
              {costItems
                .slice(-3)
                .reverse()
                .map((item) => (
                  <div key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {formatDate(item.date)} · {item.category}
                      </small>
                    </span>
                    <b>− {formatMoney(item.amount, work.currency)}</b>
                  </div>
                ))}
              {costItems.length === 0 && <p>Nenhum custo cadastrado.</p>}
            </section>
          </div>
          <div className="payment-milestones">
            <div className={receivedPercent >= 50 ? "ready" : "blocked"}>
              <span>{receivedPercent >= 50 ? "✓" : "⌛"}</span>
              <div>
                <strong>Pagamento dos 50%</strong>
                <small>
                  {receivedPercent >= 50
                    ? "Valor alcançado · aguardando confirmação manual"
                    : "Será liberado ao atingir metade do total"}
                </small>
              </div>
              <button
                type="button"
                disabled={receivedPercent < 50}
                onClick={() => {
                  const stage = work.stages.find((item) => item.label === "Pagamento dos 50%");
                  if (stage) toggleStage(stage);
                }}
              >
                Confirmar
              </button>
            </div>
            <div className={receivedPercent >= 100 ? "ready" : "blocked"}>
              <span>{receivedPercent >= 100 ? "✓" : "⌛"}</span>
              <div>
                <strong>Pagamento completo</strong>
                <small>
                  {receivedPercent >= 100
                    ? "Valor quitado · aguardando confirmação manual"
                    : "Será liberado quando o saldo chegar a zero"}
                </small>
              </div>
              <button
                type="button"
                disabled={receivedPercent < 100}
                onClick={() => {
                  const stage = work.stages.find((item) => item.label === "Pagamento completo");
                  if (stage) toggleStage(stage);
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
          <p className="automation-note">
            ◇ Pagamentos contam para o contrato; gorjetas e ganhos adicionais aumentam o resultado
            sem alterar o saldo que a cliente ainda deve.
          </p>
        </>
      )}
    </section>
  );
}
