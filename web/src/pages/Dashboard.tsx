import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { useFinanceStore } from "@/stores/finance-store"

function fmtMonth(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export function Dashboard() {
  const navigate = useNavigate()
  const {
    cards,
    transactions,
    banks,
    categories,
    getCardBalanceByMonth,
    getCardExpensesByMonth,
    valuesVisible,
    toggleValuesVisible,
    transactionSummary,
    fetchTransactionSummary,
    ensureMonths,
  } = useFinanceStore()

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  })

  useEffect(() => {
    fetchTransactionSummary(selectedMonth)
    ensureMonths([selectedMonth])
  }, [selectedMonth, transactions.length, fetchTransactionSummary, ensureMonths])

  const [y, m] = selectedMonth.split("-").map(Number)
  const monthDate = new Date(y, m - 1, 1)
  const monthStart = `${selectedMonth}-01`
  const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10)

  function changeMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const s = transactionSummary
  const receita = s?.realized.income ?? 0
  const despesas = s?.realized.expenses ?? 0
  const previstas = s?.pending.expenses ?? 0
  const patrimonio = cards
    .filter((c) => c.type === "CHECKING_ACCOUNT")
    .reduce((acc, c) => acc + getCardBalanceByMonth(c.id, selectedMonth), 0)
  const saldoAtual = receita - despesas
  const saldoProjetado = saldoAtual - previstas

  const recent = [...transactions]
    .filter((t) => t.date >= monthStart && t.date <= monthEnd)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  const creditCards = cards.filter((c) => c.type === "CREDIT_CARD")
  const checkingAccounts = cards.filter((c) => c.type === "CHECKING_ACCOUNT")

  function categoryOf(id: string | null) {
    return id ? categories.find((c) => c.id === id) : null
  }
  function bankOf(cardId: string) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return null
    return banks.find((b) => b.id === card.bank_id) ?? null
  }

  return (
    <div className="content">
      {/* Hero */}
      <div className="hero" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="hero-label">
            Patrimônio total
            <button
              className="icon-btn"
              onClick={toggleValuesVisible}
              title={valuesVisible ? "Ocultar valores" : "Mostrar valores"}
              style={{ width: 28, height: 28 }}
            >
              <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-[14px]" />
            </button>
          </div>
          <div className="month-nav">
            <button onClick={() => changeMonth(-1)}>
              <Icon name="chevron_left" className="text-[14px]" />
            </button>
            <span className="month-label">{fmtMonth(monthDate)}</span>
            <button onClick={() => changeMonth(1)}>
              <Icon name="chevron_right" className="text-[14px]" />
            </button>
          </div>
        </div>
        <div className="hero-value" style={{ marginTop: 10 }}>
          <MoneyValue value={patrimonio} />
        </div>
        <div className="hero-deltas">
          {receita > 0 && (
            <span className="hero-chip positive">
              <Icon name="trending_up" className="text-[12px]" />
              +<MoneyValue value={receita} />
            </span>
          )}
          {previstas > 0 && (
            <span className="hero-chip">
              <Icon name="schedule" className="text-[12px]" />
              <MoneyValue value={previstas} /> previsto
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <KPI label="Receita" icon="trending_up" value={receita} variant="positive" />
        <KPI label="Despesas" icon="trending_down" value={despesas} variant="negative"
             meta={<>Previstas: <span className="num" style={{ color: "var(--negative)" }}><MoneyValue value={previstas} /></span></>} />
        <KPI label="Saldo Atual" icon="account_balance" value={saldoAtual} variant={saldoAtual >= 0 ? "positive" : "negative"}
             meta="Receita - despesas realizadas" />
        <KPI label="Saldo Projetado" icon="savings" value={saldoProjetado} variant={saldoProjetado >= 0 ? "positive" : "negative"}
             meta="Quanto ainda posso gastar" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }} className="dash-grid">
        {/* Credit Cards */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Cartões de Crédito</div>
                <div className="panel-subtitle">Faturas de {fmtMonth(monthDate)}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/cards")}>Ver tudo</button>
            </div>
            {creditCards.length === 0 ? (
              <div className="empty">
                <div className="empty-title">Nenhum cartão cadastrado</div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => navigate("/cards")}>Adicionar cartão</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {creditCards.map((card) => {
                  const bank = banks.find((b) => b.id === card.bank_id)
                  const expenses = getCardExpensesByMonth(card.id, selectedMonth)
                  return (
                    <div key={card.id} className="card-row" onClick={() => navigate(`/transactions?card_id=${card.id}`)}
                         style={{ padding: 14, display: "grid", gridTemplateColumns: "32px 1fr", alignItems: "start" }}>
                      <div className="bi" style={{ background: bank?.color ?? "var(--c-porto)" }}>
                        {bank?.name?.slice(0, 2).toUpperCase() ?? "CC"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="card-name" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                        <div className="card-sub" style={{ marginTop: 2 }}>{bank?.name ?? ""}</div>
                        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fatura</span>
                          <span className="card-amount negative" style={{ fontSize: 14 }}><MoneyValue value={expenses} /></span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: accounts + activity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Minhas contas</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/accounts")}>Ver tudo</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {checkingAccounts.length === 0 ? (
                <div className="empty">
                  <div className="empty-title">Sem contas</div>
                </div>
              ) : (
                checkingAccounts.map((card) => {
                  const bank = banks.find((b) => b.id === card.bank_id)
                  const balance = getCardBalanceByMonth(card.id, selectedMonth)
                  return (
                    <div key={card.id} className="acct-row" onClick={() => navigate("/accounts")} style={{ padding: 12 }}>
                      <div className="bi sm" style={{ background: bank?.color ?? "var(--c-porto)" }}>
                        {bank?.name?.slice(0, 2).toUpperCase() ?? "AC"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="acct-name" style={{ fontSize: 13 }}>{card.name}</div>
                        <div className="acct-sub">{bank?.name ?? ""}</div>
                      </div>
                      <div className="acct-amount muted"><MoneyValue value={balance} /></div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Atividade recente</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/transactions")}>Ver tudo</button>
            </div>
            <div>
              {recent.length === 0 ? (
                <div className="empty">
                  <div className="empty-title">Sem transações</div>
                </div>
              ) : (
                recent.map((tx) => {
                  const cat = categoryOf(tx.category_id)
                  const bank = bankOf(tx.card_id)
                  return (
                    <div key={tx.id} className="tx-row" onClick={() => navigate("/transactions")}>
                      <div className="tx-icon" style={{ background: cat?.color ?? "var(--surface-2)", color: "#fff" }}>
                        <Icon name={cat?.icon ?? "receipt_long"} className="text-[13px]" />
                      </div>
                      <div className="tx-main">
                        <div className="tx-title">{tx.description}</div>
                        <div className="tx-sub">
                          <span>{cat?.name ?? "Outros"}</span>
                          {bank && (<><span className="dot" /><span>{bank.name}</span></>)}
                        </div>
                      </div>
                      <div className={`tx-amount ${tx.type === "INCOME" ? "positive" : "negative"} ${tx.is_scheduled ? "scheduled" : ""}`}>
                        {tx.type === "INCOME" ? "+" : "-"}<MoneyValue value={tx.amount} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function KPI({ label, icon, value, variant, meta }: { label: string; icon: string; value: number; variant?: "positive" | "negative" | ""; meta?: React.ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi-label">
        <Icon name={icon} className="text-[12px]" />
        {label}
      </div>
      <div className={`kpi-value ${variant ?? ""}`}>
        <MoneyValue value={value} />
      </div>
      {meta && <div className="kpi-meta">{meta}</div>}
    </div>
  )
}
