import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { useFinanceStore } from "@/stores/finance-store"
import { useAuthStore } from "@/stores/auth-store"
import { useThemeStore } from "@/stores/theme-store"

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
  const { appUser } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
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
      items.push({ id: tx.id, description: tx.description, amount: tx.amount, date: tx.date })
    }

    const now = new Date()
    const refMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const year = refMonth.getFullYear()
    const month = refMonth.getMonth()
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
    <header className="topbar">
      <div className="topbar-left" />
      <div className="topbar-right">
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} className="text-[18px]" />
        </button>

        <div className="notif-dropdown" style={{ position: "relative" }}>
          <button
            className="icon-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notificações"
          >
            <Icon name="notifications" className="text-[18px]" />
            {upcomingItems.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  minWidth: 14,
                  height: 14,
                  padding: "0 4px",
                  borderRadius: 999,
                  background: "var(--negative)",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {upcomingItems.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="filter-popover"
              style={{ width: 320, right: 0, top: 44 }}
            >
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Vencimentos próximos</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Próximos 5 dias</div>
              </div>
              {upcomingItems.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                  Nenhum vencimento próximo
                </div>
              ) : (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {upcomingItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderBottom: "1px solid var(--hairline)",
                      }}
                    >
                      <Icon name="schedule" className="text-[14px]" style={{ color: "var(--negative)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.description}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{formatDate(item.date)}</div>
                      </div>
                      <span className="num" style={{ fontSize: 12, color: "var(--negative)", fontWeight: 500 }}>
                        <MoneyValue value={item.amount} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => { navigate("/bills"); setNotifOpen(false) }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent)",
                  borderTop: "1px solid var(--hairline)",
                }}
              >
                Ver todos os vencimentos
              </button>
            </div>
          )}
        </div>

        <button
          className="avatar"
          onClick={() => navigate("/settings")}
          title="Configurações"
        >
          {appUser?.avatar_url ? (
            <img src={appUser.avatar_url} alt={appUser.name ?? "Avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            (appUser?.name?.[0] ?? "U").toUpperCase()
          )}
        </button>
      </div>
    </header>
  )
}
