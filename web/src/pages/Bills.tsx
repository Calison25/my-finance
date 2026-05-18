import { useState, useMemo } from "react"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { useFinanceStore } from "@/stores/finance-store"
import { api } from "@/services/api"

interface BillItem {
  id: string
  description: string
  amount: number
  dueDay: number
  isPaid: boolean
}

interface CardSection {
  cardId: string
  title: string
  bankColor: string | null
  bankInitials: string
  dueDay: number
  total: number
  isPaid: boolean
  allTxIds: string[]
  individualBills: BillItem[]
  remainderTxIds: string[]
  remainderAmount: number
  remainderPaid: boolean
}

export function Bills() {
  const { transactions, cards, banks, realizeTransaction, unrealizeTransaction, valuesVisible, toggleValuesVisible } = useFinanceStore()

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  })

  const [year, month] = selectedMonth.split("-").map(Number)
  const monthLabel = new Date(year, month - 1, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  const monthStart = `${selectedMonth}-01`
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)

  function changeMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  function getCardLabel(cardId: string) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return "--"
    const bank = banks.find((b) => b.id === card.bank_id)
    return bank ? `${bank.name} - ${card.name}` : card.name
  }

  const { plainBills, cardSections } = useMemo(() => {
    const creditCards = cards.filter((c) => c.type === "CREDIT_CARD")
    const creditCardIds = new Set(creditCards.map((c) => c.id))

    const plain: BillItem[] = transactions
      .filter(
        (t) =>
          t.date >= monthStart &&
          t.date <= monthEnd &&
          t.is_bill &&
          !creditCardIds.has(t.card_id),
      )
      .map((tx) => ({
        id: tx.id,
        description: `${tx.description} · ${getCardLabel(tx.card_id)}`,
        amount: tx.amount,
        dueDay: Number(tx.date.slice(8, 10)),
        isPaid: tx.is_realized,
      }))
      .sort((a, b) => a.dueDay - b.dueDay)

    const sections: CardSection[] = creditCards
      .map((card) => {
        const cardTxs = transactions.filter(
          (t) =>
            t.card_id === card.id &&
            t.type === "EXPENSE" &&
            t.date >= monthStart &&
            t.date <= monthEnd,
        )
        if (cardTxs.length === 0) return null

        const individuals = cardTxs.filter((t) => t.is_bill)
        const remainder = cardTxs.filter((t) => !t.is_bill)
        const total = cardTxs.reduce((acc, t) => acc + t.amount, 0)
        const remainderAmount = remainder.reduce((acc, t) => acc + t.amount, 0)
        const bank = banks.find((b) => b.id === card.bank_id)

        const individualBills: BillItem[] = individuals
          .map((tx) => ({
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            dueDay: Number(tx.date.slice(8, 10)),
            isPaid: tx.is_realized,
          }))
          .sort((a, b) => a.dueDay - b.dueDay)

        return {
          cardId: card.id,
          title: bank ? `${bank.name} - ${card.name}` : card.name,
          bankColor: bank?.color ?? null,
          bankInitials: bank?.name?.slice(0, 2).toUpperCase() ?? "CC",
          dueDay: card.due_day ?? 1,
          total,
          isPaid: cardTxs.every((t) => t.is_realized),
          allTxIds: cardTxs.map((t) => t.id),
          individualBills,
          remainderTxIds: remainder.map((t) => t.id),
          remainderAmount,
          remainderPaid: remainder.length > 0 && remainder.every((t) => t.is_realized),
        } as CardSection
      })
      .filter((s): s is CardSection => s !== null)
      .sort((a, b) => a.dueDay - b.dueDay)

    return { plainBills: plain, cardSections: sections }
  }, [transactions, cards, banks, selectedMonth, monthStart, monthEnd])

  const totalAmount =
    plainBills.reduce((acc, b) => acc + b.amount, 0) +
    cardSections.reduce((acc, s) => acc + s.total, 0)
  const paidAmount =
    plainBills.filter((b) => b.isPaid).reduce((acc, b) => acc + b.amount, 0) +
    cardSections.reduce(
      (acc, s) =>
        acc +
        s.individualBills.filter((b) => b.isPaid).reduce((a, b) => a + b.amount, 0) +
        (s.remainderPaid ? s.remainderAmount : 0),
      0,
    )
  const pendingAmount = totalAmount - paidAmount

  const today = new Date()
  const todayDay = today.getDate()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function isExpanded(cardId: string, hasIndividuals: boolean) {
    if (!hasIndividuals) return false
    return expanded[cardId] ?? true
  }

  function toggleExpanded(cardId: string) {
    setExpanded((s) => ({ ...s, [cardId]: !(s[cardId] ?? true) }))
  }

  async function batchToggle(ids: string[], paid: boolean, loadingKey: string) {
    setLoadingId(loadingKey)
    try {
      const updated = paid
        ? await Promise.all(ids.map((id) => api.transactions.update(id, { is_realized: false })))
        : await Promise.all(ids.map((id) => api.transactions.realize(id)))
      const byId = new Map(updated.map((tx) => [tx.id, tx]))
      useFinanceStore.setState((s) => ({
        transactions: s.transactions.map((t) => byId.get(t.id) ?? t),
      }))
    } catch (err) {
      console.error("Erro ao alterar status:", err)
    } finally {
      setLoadingId(null)
    }
  }

  async function toggleSingle(id: string, isPaid: boolean) {
    setLoadingId(id)
    try {
      if (isPaid) {
        await unrealizeTransaction(id)
      } else {
        await realizeTransaction(id)
      }
    } catch (err) {
      console.error("Erro ao alterar status:", err)
    } finally {
      setLoadingId(null)
    }
  }

  function Checkbox({ id, checked, onClick }: { id: string; checked: boolean; onClick: () => void }) {
    const loading = loadingId === id
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!loading) onClick()
        }}
        disabled={loading}
        className="shrink-0 cursor-pointer hover:opacity-80"
      >
        {loading ? (
          <div className="w-7 h-7 rounded-full border-2 border-income border-t-transparent animate-spin" />
        ) : checked ? (
          <div className="w-7 h-7 rounded-full bg-income flex items-center justify-center">
            <Icon name="check" className="text-white text-sm" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full border-2 border-outline-variant hover:border-income transition-colors" />
        )}
      </button>
    )
  }

  const hasContent = plainBills.length > 0 || cardSections.length > 0

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>Vencimentos</h1>
        </div>
        <div className="actions">
          <button className="icon-btn" onClick={toggleValuesVisible} title={valuesVisible ? "Ocultar valores" : "Mostrar valores"}>
            <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-[16px]" />
          </button>
          <div className="month-nav">
            <button onClick={() => changeMonth(-1)}><Icon name="chevron_left" className="text-[14px]" /></button>
            <span className="month-label">{monthLabel}</span>
            <button onClick={() => changeMonth(1)}><Icon name="chevron_right" className="text-[14px]" /></button>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label"><Icon name="payments" className="text-[12px]" />Total</div>
          <div className="kpi-value"><MoneyValue value={totalAmount} /></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="check_circle" className="text-[12px]" />Pago</div>
          <div className="kpi-value positive"><MoneyValue value={paidAmount} /></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="schedule" className="text-[12px]" />Pendente</div>
          <div className="kpi-value negative"><MoneyValue value={pendingAmount} /></div>
        </div>
      </div>

      {!hasContent ? (
        <div className="panel empty">
          <div className="empty-title">Nenhum vencimento</div>
          <p>Nenhuma conta a pagar encontrada para {monthLabel}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Plain bills (non credit card) */}
          {plainBills.length > 0 && (
            <div className="bg-surface-container-low rounded-xl ghost-border divide-y divide-outline-variant/15">
              {plainBills.map((bill) => {
                const isOverdue = isCurrentMonth && bill.dueDay < todayDay && !bill.isPaid
                const loading = loadingId === bill.id
                return (
                  <div key={bill.id} className={`flex items-center gap-4 px-5 py-4 transition-all ${loading ? "bg-primary-container/10" : ""}`}>
                    <Checkbox id={bill.id} checked={bill.isPaid} onClick={() => toggleSingle(bill.id, bill.isPaid)} />
                    <div className={`flex-1 min-w-0 transition-opacity ${loading ? "opacity-50" : ""}`}>
                      <p className={`text-sm font-medium truncate ${bill.isPaid ? "line-through opacity-50" : ""}`}>{bill.description}</p>
                      <p className="text-[10px] text-on-surface-variant">Vence dia {bill.dueDay}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {loading ? (
                        <p className="text-[11px] text-primary font-medium animate-pulse">Salvando…</p>
                      ) : (
                        <>
                          <p className={`text-sm font-bold ${bill.isPaid ? "text-income" : "text-error"}`}>
                            <MoneyValue value={bill.amount} />
                          </p>
                          {isOverdue && <span className="text-[9px] text-error font-bold">Vencido</span>}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Card sections */}
          {cardSections.map((section) => {
            const hasIndividuals = section.individualBills.length > 0
            const open = isExpanded(section.cardId, hasIndividuals)
            const isOverdue = isCurrentMonth && section.dueDay < todayDay && !section.isPaid
            const headerLoadingKey = `card-${section.cardId}`
            const headerLoading = loadingId === headerLoadingKey

            return (
              <div key={section.cardId} className="bg-surface-container-low rounded-xl ghost-border overflow-hidden">
                {/* Header */}
                <div
                  role={hasIndividuals ? "button" : undefined}
                  onClick={hasIndividuals ? () => toggleExpanded(section.cardId) : undefined}
                  className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 transition-all ${hasIndividuals ? "cursor-pointer hover:bg-surface-container active:bg-surface-container-high" : ""} ${headerLoading ? "bg-primary-container/10" : ""}`}
                >
                  <Checkbox
                    id={headerLoadingKey}
                    checked={section.isPaid}
                    onClick={() => batchToggle(section.allTxIds, section.isPaid, headerLoadingKey)}
                  />
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 transition-opacity ${headerLoading ? "opacity-50" : ""}`}
                    style={{ backgroundColor: section.bankColor ?? "#6B7280" }}
                  >
                    {section.bankInitials}
                  </div>
                  <div className={`flex-1 min-w-0 transition-opacity ${headerLoading ? "opacity-50" : ""}`}>
                    <p className={`text-sm font-bold truncate ${section.isPaid ? "line-through opacity-50" : ""}`}>{section.title}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      Fatura · Vence dia {section.dueDay}
                      {hasIndividuals && ` · ${section.individualBills.length} marcado(s)`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {headerLoading ? (
                      <p className="text-[11px] text-primary font-medium animate-pulse">Salvando…</p>
                    ) : (
                      <>
                        <p className={`text-sm sm:text-base font-bold ${section.isPaid ? "text-income" : "text-error"}`}>
                          <MoneyValue value={section.total} />
                        </p>
                        {isOverdue && <span className="text-[9px] text-error font-bold">Vencido</span>}
                      </>
                    )}
                  </div>
                  {hasIndividuals && (
                    <Icon
                      name="expand_more"
                      className={`text-on-surface-variant transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
                    />
                  )}
                </div>

                {/* Children */}
                {hasIndividuals && open && (
                  <div className="border-t border-outline-variant/15 bg-surface/30 divide-y divide-outline-variant/10">
                    {section.individualBills.map((bill) => {
                      const billOverdue = isCurrentMonth && bill.dueDay < todayDay && !bill.isPaid
                      const loading = loadingId === bill.id
                      return (
                        <div key={bill.id} className={`flex items-center gap-4 px-5 py-3 pl-12 transition-all ${loading ? "bg-primary-container/10" : ""}`}>
                          <Checkbox id={bill.id} checked={bill.isPaid} onClick={() => toggleSingle(bill.id, bill.isPaid)} />
                          <div className={`flex-1 min-w-0 transition-opacity ${loading ? "opacity-50" : ""}`}>
                            <p className={`text-sm font-medium truncate ${bill.isPaid ? "line-through opacity-50" : ""}`}>{bill.description}</p>
                            <p className="text-[10px] text-on-surface-variant">Vence dia {bill.dueDay}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {loading ? (
                              <p className="text-[11px] text-primary font-medium animate-pulse">Salvando…</p>
                            ) : (
                              <>
                                <p className={`text-sm font-bold ${bill.isPaid ? "text-income" : "text-error"}`}>
                                  <MoneyValue value={bill.amount} />
                                </p>
                                {billOverdue && <span className="text-[9px] text-error font-bold">Vencido</span>}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {section.remainderAmount > 0 && (() => {
                      const remainderKey = `remainder-${section.cardId}`
                      const loading = loadingId === remainderKey
                      return (
                        <div className={`flex items-center gap-4 px-5 py-3 pl-12 transition-all ${loading ? "bg-primary-container/10" : ""}`}>
                          <Checkbox
                            id={remainderKey}
                            checked={section.remainderPaid}
                            onClick={() =>
                              batchToggle(section.remainderTxIds, section.remainderPaid, remainderKey)
                            }
                          />
                          <div className={`flex-1 min-w-0 transition-opacity ${loading ? "opacity-50" : ""}`}>
                            <p className={`text-sm font-medium italic ${section.remainderPaid ? "line-through opacity-50" : ""}`}>
                              Remanescente da fatura
                            </p>
                            <p className="text-[10px] text-on-surface-variant">
                              {section.remainderTxIds.length} lançamento(s)
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {loading ? (
                              <p className="text-[11px] text-primary font-medium animate-pulse">Salvando…</p>
                            ) : (
                              <p className={`text-sm font-bold ${section.remainderPaid ? "text-income" : "text-error"}`}>
                                <MoneyValue value={section.remainderAmount} />
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
