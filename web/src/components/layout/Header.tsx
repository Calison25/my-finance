import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { useFinanceStore } from "@/stores/finance-store"

interface UpcomingItem {
  id: string
  description: string
  amount: number
  date: string
}

function isDueWithin5Days(dueDay: number): boolean {
  const today = new Date()
  const todayDay = today.getDate()
  const year = today.getFullYear()
  const month = today.getMonth()
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()

  const dueDate = new Date(year, month, Math.min(dueDay, lastDayOfMonth))
  const todayDate = new Date(year, month, todayDay)
  const in5days = new Date(todayDate.getTime() + 5 * 24 * 60 * 60 * 1000)

  return dueDate >= todayDate && dueDate <= in5days
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export function Header() {
  const navigate = useNavigate()
  const { transactions, cards, banks } = useFinanceStore()
  const [notifOpen, setNotifOpen] = useState(false)

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const in5days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
  const in5daysStr = in5days.toISOString().slice(0, 10)

  const upcomingItems = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = []

    const billTxs = transactions.filter(
      (t) => !t.is_realized && t.is_bill && t.date >= todayStr && t.date <= in5daysStr
    )
    for (const tx of billTxs) {
      items.push({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
      })
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const selectedMonth = `${year}-${String(month + 1).padStart(2, "0")}`
    const monthStart = `${selectedMonth}-01`
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10)

    const creditCards = cards.filter(
      (c) => c.type === "CREDIT_CARD" && c.due_day && isDueWithin5Days(c.due_day)
    )
    for (const card of creditCards) {
      const cardTxs = transactions.filter(
        (t) => t.card_id === card.id && t.type === "EXPENSE" && t.date >= monthStart && t.date <= monthEnd
      )
      const total = cardTxs.reduce((acc, t) => acc + t.amount, 0)
      if (total <= 0) continue

      const bank = banks.find((b) => b.id === card.bank_id)
      const dueDay = card.due_day!
      const dueDateStr = `${selectedMonth}-${String(dueDay).padStart(2, "0")}`

      items.push({
        id: `card-invoice-${card.id}`,
        description: `Fatura ${bank ? `${bank.name} - ` : ""}${card.name}`,
        amount: total,
        date: dueDateStr,
      })
    }

    return items.sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions, cards, banks, todayStr, in5daysStr])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifOpen && !(e.target as Element).closest(".notif-dropdown")) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [notifOpen])

  return (
    <header className="bg-surface sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full overflow-hidden ghost-border bg-surface-container-high flex items-center justify-center">
            <Icon name="account_balance" className="text-primary text-xl" filled />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary font-headline">
            My Finance
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative notif-dropdown">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-3 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-300 rounded-full active:scale-95 cursor-pointer"
            >
              <Icon name="notifications" />
              {upcomingItems.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-error text-on-error text-[10px] font-bold px-1 pointer-events-none">
                  {upcomingItems.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-low rounded-xl ghost-border shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/15">
                  <p className="font-headline font-bold text-sm">Vencimentos proximos</p>
                  <p className="text-[10px] text-on-surface-variant">Proximos 5 dias</p>
                </div>
                {upcomingItems.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-on-surface-variant">Nenhum vencimento proximo</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/10">
                    {upcomingItems.map((item) => (
                      <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                        <Icon name="schedule" className="text-error text-sm shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.description}</p>
                          <p className="text-[10px] text-on-surface-variant">{formatDate(item.date)}</p>
                        </div>
                        <span className="text-sm font-bold text-error shrink-0">
                          <MoneyValue value={item.amount} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { navigate("/bills"); setNotifOpen(false) }}
                  className="w-full px-4 py-3 text-center text-xs font-bold text-primary border-t border-outline-variant/15 hover:bg-surface-container-high transition-colors"
                >
                  Ver todos os vencimentos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
