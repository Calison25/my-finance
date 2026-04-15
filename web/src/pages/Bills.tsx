import { useState, useMemo } from "react"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { useFinanceStore } from "@/stores/finance-store"

interface BillItem {
  id: string
  description: string
  amount: number
  dueDay: number
  dueDate: string
  isPaid: boolean
  cardName: string
  bankColor: string | null
  bankInitials: string
}

export function Bills() {
  const { transactions, cards, banks, realizeTransaction, unrealizeTransaction } = useFinanceStore()

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

  function getCardInfo(cardId: string) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return { name: "--", bankColor: null, bankInitials: "??" }
    const bank = banks.find((b) => b.id === card.bank_id)
    return {
      name: bank ? `${bank.name} - ${card.name}` : card.name,
      bankColor: bank?.color ?? null,
      bankInitials: bank?.name?.slice(0, 2).toUpperCase() ?? "CC",
    }
  }

  const bills = useMemo<BillItem[]>(() => {
    const billTxs = transactions.filter(
      (t) => t.date >= monthStart && t.date <= monthEnd && t.is_bill
    )

    return billTxs
      .map((tx) => {
        const cardInfo = getCardInfo(tx.card_id)
        return {
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          dueDay: Number(tx.date.slice(8, 10)),
          dueDate: tx.date,
          isPaid: tx.is_realized,
          cardName: cardInfo.name,
          bankColor: cardInfo.bankColor,
          bankInitials: cardInfo.bankInitials,
        }
      })
      .sort((a, b) => a.dueDay - b.dueDay)
  }, [transactions, cards, banks, selectedMonth, monthStart, monthEnd])

  const totalAmount = bills.reduce((acc, b) => acc + b.amount, 0)
  const paidAmount = bills.filter((b) => b.isPaid).reduce((acc, b) => acc + b.amount, 0)
  const pendingAmount = totalAmount - paidAmount

  const today = new Date()
  const todayDay = today.getDate()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleTogglePaid(bill: BillItem) {
    setLoadingId(bill.id)
    try {
      if (bill.isPaid) {
        await unrealizeTransaction(bill.id)
      } else {
        await realizeTransaction(bill.id)
      }
    } catch (err) {
      console.error("Erro ao alterar status:", err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight">Vencimentos</h2>
          <p className="text-on-surface-variant text-sm mt-1">Controle de pagamentos do mes</p>
        </div>
      </div>

      {/* Month Picker */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors">
          <Icon name="chevron_left" className="text-on-surface-variant" />
        </button>
        <h3 className="font-headline font-bold text-lg text-on-surface capitalize">{monthLabel}</h3>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors">
          <Icon name="chevron_right" className="text-on-surface-variant" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-surface-container-low rounded-xl p-3 sm:p-5 ghost-border">
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
              <Icon name="payments" className="text-on-surface text-sm" />
            </div>
            <p className="text-[10px] sm:text-xs text-on-surface-variant">Total</p>
          </div>
          <p className="text-sm sm:text-xl font-headline font-bold text-center sm:text-left"><MoneyValue value={totalAmount} /></p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-3 sm:p-5 ghost-border">
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-income-container/20 flex items-center justify-center shrink-0">
              <Icon name="check_circle" className="text-income text-sm" />
            </div>
            <p className="text-[10px] sm:text-xs text-on-surface-variant">Pago</p>
          </div>
          <p className="text-sm sm:text-xl font-headline font-bold text-income text-center sm:text-left"><MoneyValue value={paidAmount} /></p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-3 sm:p-5 ghost-border">
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-error-container/20 flex items-center justify-center shrink-0">
              <Icon name="schedule" className="text-error text-sm" />
            </div>
            <p className="text-[10px] sm:text-xs text-on-surface-variant">Pendente</p>
          </div>
          <p className="text-sm sm:text-xl font-headline font-bold text-error text-center sm:text-left"><MoneyValue value={pendingAmount} /></p>
        </div>
      </div>

      {/* Checklist */}
      {bills.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-10 ghost-border text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="event_available" className="text-3xl text-primary" />
          </div>
          <p className="text-lg font-headline font-bold mb-2">Nenhum vencimento</p>
          <p className="text-sm text-on-surface-variant">Nenhuma conta a pagar encontrada para {monthLabel}</p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-xl ghost-border divide-y divide-outline-variant/15">
          {bills.map((bill) => {
            const isOverdue = isCurrentMonth && bill.dueDay < todayDay

            return (
              <div key={bill.id} className="flex items-center gap-4 px-5 py-4">
                {/* Checkbox circle */}
                <button
                  type="button"
                  onClick={() => handleTogglePaid(bill)}
                  disabled={loadingId === bill.id}
                  className="shrink-0 cursor-pointer hover:opacity-80"
                >
                  {loadingId === bill.id ? (
                    <div className="w-7 h-7 rounded-full border-2 border-income border-t-transparent animate-spin" />
                  ) : bill.isPaid ? (
                    <div className="w-7 h-7 rounded-full bg-income flex items-center justify-center">
                      <Icon name="check" className="text-white text-sm" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-outline-variant hover:border-income transition-colors cursor-pointer" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${bill.isPaid ? "line-through opacity-50" : ""}`}>{bill.description}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {bill.cardName} · Vence dia {bill.dueDay}
                  </p>
                </div>

                {/* Amount + badge */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${bill.isPaid ? "text-income" : "text-error"}`}>
                    <MoneyValue value={bill.amount} />
                  </p>
                  {isOverdue && !bill.isPaid && (
                    <span className="text-[9px] text-error font-bold">Vencido</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
