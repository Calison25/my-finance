import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"

function fmtMonth(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${date} às ${time}`
}

function formatCentsToBRL(cents: number): string {
  if (cents === 0) return ""
  const reais = Math.floor(cents / 100)
  const cv = cents % 100
  return `${reais.toLocaleString("pt-BR")},${String(cv).padStart(2, "0")}`
}

function parseBRLToNumber(s: string): number {
  const d = s.replace(/\D/g, "")
  return d ? parseInt(d, 10) / 100 : 0
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
    ensureMonths,
    expenseGoal,
    fetchExpenseGoal,
    setExpenseGoal,
  } = useFinanceStore()

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  })

  useEffect(() => {
    ensureMonths([selectedMonth])
  }, [selectedMonth, ensureMonths])

  useEffect(() => {
    fetchExpenseGoal()
  }, [fetchExpenseGoal])

  const [y, m] = selectedMonth.split("-").map(Number)
  const monthDate = new Date(y, m - 1, 1)

  function changeMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  )

  const summary = useMemo(() => {
    const src = monthTx
    const sum = (arr: typeof src) => arr.reduce((s, t) => s + Number(t.amount), 0)
    const isEffectivelyRealized = (t: typeof src[number]) => {
      if (t.is_scheduled && !t.is_realized) return false
      return t.is_realized || t.is_recurring || t.classification === "installment"
    }
    const receita = sum(src.filter((t) => t.type === "INCOME"))
    const despesasRealizadas = sum(src.filter((t) => t.type === "EXPENSE" && isEffectivelyRealized(t)))
    const despesasPrevistas = sum(src.filter((t) => t.type === "EXPENSE" && t.is_scheduled && !t.is_realized))
    const despesasTotal = despesasRealizadas + despesasPrevistas
    const saldoAtual = receita - despesasRealizadas
    const saldoFuturo = receita - despesasTotal

    const recurring = src.filter((t) => t.classification === "recurring")
    const recurringIncome = sum(recurring.filter((t) => t.type === "INCOME"))
    const recurringExpense = sum(recurring.filter((t) => t.type === "EXPENSE"))
    const installments = src.filter((t) => t.classification === "installment")
    const installmentTotal = sum(installments.filter((t) => t.type === "INCOME")) - sum(installments.filter((t) => t.type === "EXPENSE"))
    const scheduled = src.filter((t) => t.classification === "scheduled")
    const scheduledTotal = sum(scheduled.filter((t) => t.type === "INCOME")) - sum(scheduled.filter((t) => t.type === "EXPENSE"))

    return {
      receita,
      despesasTotal,
      despesasPrevistas,
      saldoAtual,
      saldoFuturo,
      recurringCount: recurring.length,
      recurringIncome,
      recurringExpense,
      recurringNet: recurringIncome - recurringExpense,
      installmentCount: installments.length,
      installmentTotal,
      scheduledCount: scheduled.length,
      scheduledTotal,
    }
  }, [monthTx])

  const lastCreatedInMonth = useMemo(() => {
    if (monthTx.length === 0) return null
    return monthTx.reduce((latest, t) => ((t.created_at ?? "") > (latest.created_at ?? "") ? t : latest))
  }, [monthTx])

  const patrimonio = cards
    .filter((c) => c.type === "CHECKING_ACCOUNT")
    .reduce((acc, c) => acc + getCardBalanceByMonth(c.id, selectedMonth), 0)

  const recent = [...transactions]
    .filter((t) => t.date.startsWith(selectedMonth))
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

  function fmtBRL(v: number) {
    return valuesVisible ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ ••••••"
  }

  // ---- meta de despesa ----
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalInput, setGoalInput] = useState("")
  const despesaAbs = summary.despesasTotal
  const hasGoal = expenseGoal != null
  const overGoal = hasGoal && despesaAbs > (expenseGoal as number)
  const sobra = hasGoal ? (expenseGoal as number) - despesaAbs : 0
  const goalPct = hasGoal && (expenseGoal as number) > 0 ? Math.min(100, (despesaAbs / (expenseGoal as number)) * 100) : 0
  const goalMessage = !hasGoal
    ? "Defina uma meta de despesa para acompanhar quanto você pode gastar no mês."
    : overGoal
      ? `Você já ultrapassou sua meta de despesa em ${fmtBRL(despesaAbs - (expenseGoal as number))}.`
      : `Você já usou ${fmtBRL(despesaAbs)} da sua meta de ${fmtBRL(expenseGoal as number)} — ainda tem ${fmtBRL(sobra)} sobrando.`

  function openGoalModal() {
    setGoalInput(expenseGoal != null ? formatCentsToBRL(Math.round(expenseGoal * 100)) : "")
    setGoalModalOpen(true)
  }

  async function handleSaveGoal() {
    const amount = parseBRLToNumber(goalInput)
    await setExpenseGoal(amount)
    setGoalModalOpen(false)
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
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <KPI label="Receita" icon="trending_up" value={summary.receita} variant="positive"
             onClick={() => navigate(`/transactions?month=${selectedMonth}&type=INCOME`)} />
        <KPI label="Despesas" icon="trending_down" value={summary.despesasTotal} variant="negative"
             meta={summary.despesasPrevistas > 0 ? <>Previstas: <span className="num" style={{ color: "var(--negative)" }}><MoneyValue value={summary.despesasPrevistas} /></span></> : undefined}
             onClick={() => navigate(`/transactions?month=${selectedMonth}&type=EXPENSE`)} />
        <div className="kpi">
          <div className="kpi-label"><Icon name="account_balance" className="text-[12px]" />Saldo</div>
          <div style={{ display: "flex", gap: 20, marginTop: 2 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Atual</div>
              <div className={`kpi-value ${summary.saldoAtual >= 0 ? "positive" : "negative"}`} style={{ fontSize: 20 }}>
                <MoneyValue value={summary.saldoAtual} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Futuro</div>
              <div className={`kpi-value ${summary.saldoFuturo >= 0 ? "positive" : "negative"}`} style={{ fontSize: 20 }}>
                <MoneyValue value={summary.saldoFuturo} />
              </div>
            </div>
          </div>
          <div className="kpi-meta" style={{ marginTop: 8 }}>Atual: receita − despesas realizadas · Futuro: quanto ainda posso gastar</div>
        </div>
      </div>

      {/* Recorrentes / Parcelados / Agendados */}
      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 16 }}>
        <div
          className="kpi"
          role="button"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/transactions?month=${selectedMonth}&classification=recurring`)}
        >
          <div className="kpi-label">
            <Icon name="repeat" className="text-[12px]" />Recorrentes
            <span style={{ marginLeft: "auto", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{summary.recurringCount}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div className={`kpi-value ${summary.recurringNet >= 0 ? "positive" : "negative"}`} style={{ fontSize: 20 }}>
              {summary.recurringNet >= 0 ? "+" : "-"}<MoneyValue value={Math.abs(summary.recurringNet)} />
            </div>
            <div style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "var(--font-mono)" }}>
              {summary.recurringIncome > 0 && (
                <span style={{ color: "var(--positive)" }}>+<MoneyValue value={summary.recurringIncome} /></span>
              )}
              {summary.recurringExpense > 0 && (
                <span style={{ color: "var(--negative)" }}>-<MoneyValue value={summary.recurringExpense} /></span>
              )}
            </div>
          </div>
        </div>
        <div
          className="kpi"
          role="button"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/transactions?month=${selectedMonth}&classification=installment`)}
        >
          <div className="kpi-label">
            <Icon name="payments" className="text-[12px]" />Parcelados
            <span style={{ marginLeft: "auto", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{summary.installmentCount}</span>
          </div>
          <div className={`kpi-value ${summary.installmentTotal >= 0 ? "positive" : "negative"}`} style={{ fontSize: 20 }}>
            {summary.installmentTotal >= 0 ? "+" : "-"}<MoneyValue value={Math.abs(summary.installmentTotal)} />
          </div>
        </div>
        <div
          className="kpi"
          role="button"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/transactions?month=${selectedMonth}&classification=scheduled`)}
        >
          <div className="kpi-label">
            <Icon name="schedule" className="text-[12px]" />Agendados
            <span style={{ marginLeft: "auto", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{summary.scheduledCount}</span>
          </div>
          <div className={`kpi-value ${summary.scheduledTotal >= 0 ? "positive" : "negative"}`} style={{ fontSize: 20 }}>
            {summary.scheduledTotal >= 0 ? "+" : "-"}<MoneyValue value={Math.abs(summary.scheduledTotal)} />
          </div>
        </div>
      </div>

      {/* Meta de despesa */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasGoal ? 14 : 4 }}>
          <div className="panel-title" style={{ fontSize: 12, letterSpacing: "0.04em" }}>META DE DESPESA</div>
          <button className="btn btn-ghost btn-sm" onClick={openGoalModal}>
            <Icon name="edit" className="text-[12px]" /> Editar
          </button>
        </div>
        {hasGoal ? (
          <>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div className="kpi-label">Gasto</div>
                <div className="kpi-value negative"><MoneyValue value={despesaAbs} /></div>
              </div>
              <div>
                <div className="kpi-label">Meta</div>
                <div className="kpi-value"><MoneyValue value={expenseGoal as number} /></div>
              </div>
              <div>
                <div className="kpi-label">{overGoal ? "Ultrapassou" : "Sobra"}</div>
                <div className={`kpi-value ${overGoal ? "negative" : "positive"}`}>
                  <MoneyValue value={overGoal ? despesaAbs - (expenseGoal as number) : sobra} />
                </div>
              </div>
            </div>
            <div style={{ height: 10, borderRadius: 6, overflow: "hidden", background: "var(--surface-2)", marginTop: 16 }}>
              <div style={{ width: `${goalPct}%`, height: "100%", background: overGoal ? "var(--negative)" : "var(--positive)" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>{goalMessage}</div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{goalMessage}</div>
        )}
      </div>

      {/* Última transação */}
      {lastCreatedInMonth && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            marginBottom: 16,
            borderRadius: 10,
            background: "var(--surface-2)",
            border: "1px solid var(--hairline)",
            fontSize: 13,
            flexWrap: "wrap",
          }}
        >
          <Icon name="history" className="text-[14px]" style={{ color: "var(--accent)" }} />
          <span style={{ color: "var(--text-3)" }}>Última transação cadastrada no mês:</span>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{lastCreatedInMonth.description}</span>
          <span style={{ color: lastCreatedInMonth.type === "INCOME" ? "var(--positive)" : "var(--negative)" }}>
            {lastCreatedInMonth.type === "INCOME" ? "+" : "-"}
            <MoneyValue value={Math.abs(Number(lastCreatedInMonth.amount))} />
          </span>
          <span style={{ marginLeft: "auto", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            {formatCreatedAt(lastCreatedInMonth.created_at)}
          </span>
        </div>
      )}

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

      <Dialog open={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Meta de despesa">
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16, lineHeight: 1.5 }}>
          Defina quanto você gostaria de gastar no mês. A diferença para a despesa realizada + prevista é sua sobra (ou o quanto ultrapassou).
        </p>
        <div className="field">
          <label className="label">Valor da meta</label>
          <input
            className="input input-amount despesa"
            value={goalInput}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              const cents = raw ? parseInt(raw, 10) : 0
              setGoalInput(formatCentsToBRL(cents))
            }}
            placeholder="0,00"
            inputMode="numeric"
            autoFocus
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => setGoalModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSaveGoal}>Salvar</button>
        </div>
      </Dialog>

      <style>{`
        @media (max-width: 1100px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function KPI({ label, icon, value, variant, meta, onClick }: { label: string; icon: string; value: number; variant?: "positive" | "negative" | ""; meta?: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="kpi" role={onClick ? "button" : undefined} style={onClick ? { cursor: "pointer" } : undefined} onClick={onClick}>
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
