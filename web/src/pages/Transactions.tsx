import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import type { TransactionType } from "@/types"

const CATEGORY_ICONS: Record<string, string> = {
  "Alimentacao": "restaurant",
  "Transporte": "directions_car",
  "Moradia": "home",
  "Saude": "health_and_safety",
  "Educacao": "school",
  "Lazer": "movie",
  "Compras": "shopping_bag",
  "Servicos": "build",
  "Investimentos": "trending_up",
  "Outros": "receipt_long",
}

export function Transactions() {
  const { transactions, cards, categories, banks, addTransaction, updateTransaction, deleteTransaction, realizeTransaction, getCardBalance, getCardExpenses } = useFinanceStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<string | null>(null)
  const [editCascade, setEditCascade] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const filterCardId = searchParams.get("card_id") ?? ""
  const setFilterCardId = (id: string) => {
    if (id) {
      setSearchParams({ card_id: id })
    } else {
      setSearchParams({})
    }
  }
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [expandedSection, setExpandedSection] = useState<"recurring" | "scheduled" | null>(null)
  const [filterType, setFilterType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL")
  const [form, setForm] = useState({
    card_id: "",
    description: "",
    amount: "",
    type: "EXPENSE" as TransactionType,
    category_id: "",
    custom_category_name: "",
    date: new Date().toISOString().slice(0, 10),
    is_scheduled: false,
    scheduled_date: "",
    notes: "",
    is_installment: false,
    installments: "",
    is_recurring: false,
    is_bill: false,
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownOpen])

  const isOtherCategory = form.category_id === "__other__"

  function isInstallment(tx: { description: string }) {
    return /\(\d+\/\d+\)$/.test(tx.description)
  }

  function getBaseDescription(desc: string) {
    return desc.replace(/\s\(\d+\/\d+\)$/, "")
  }

  function openEdit(tx: typeof transactions[0]) {
    setEditingTx(tx.id)
    setEditCascade(false)
    setForm({
      card_id: tx.card_id,
      description: getBaseDescription(tx.description),
      amount: String(tx.amount),
      type: tx.type,
      category_id: tx.category_id ?? "",
      custom_category_name: "",
      date: tx.date,
      is_scheduled: tx.is_scheduled,
      scheduled_date: tx.scheduled_date ?? "",
      notes: tx.notes ?? "",
      is_installment: false,
      installments: "",
      is_recurring: tx.is_recurring,
      is_bill: tx.is_bill,
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setDropdownOpen(false)
    setEditingTx(null)
    setEditCascade(false)
  }

  const defaultForm = {
    card_id: "",
    description: "",
    amount: "",
    type: "EXPENSE" as TransactionType,
    category_id: "",
    custom_category_name: "",
    date: new Date().toISOString().slice(0, 10),
    is_scheduled: false,
    scheduled_date: "",
    notes: "",
    is_installment: false,
    installments: "",
    is_recurring: false,
    is_bill: false,
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.card_id || !form.description || !form.amount) return
    if (isOtherCategory && !form.custom_category_name) return

    if (editingTx) {
      updateTransaction(editingTx, {
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        category_id: isOtherCategory ? null : (form.category_id || null),
        notes: form.notes || null,
        is_recurring: form.is_recurring,
      }, editCascade)
    } else {
      addTransaction({
        card_id: form.card_id,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        category_id: isOtherCategory ? undefined : (form.category_id || undefined),
        custom_category_name: isOtherCategory ? form.custom_category_name : undefined,
        date: form.date,
        is_scheduled: form.is_scheduled,
        scheduled_date: form.is_scheduled ? form.scheduled_date : undefined,
        notes: form.notes || undefined,
        installments: form.is_installment && form.installments ? Number(form.installments) : undefined,
        is_recurring: form.is_recurring || undefined,
        is_bill: form.is_bill || undefined,
      })
    }

    setForm(defaultForm)
    closeDialog()
  }

  function getCardName(cardId: string) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return "--"
    const bank = banks.find((b) => b.id === card.bank_id)
    return `${bank?.name ?? ""} ${card.name}`
  }

  function getCategoryInfo(catId: string | null) {
    if (!catId) return { icon: "receipt_long", name: "Sem categoria" }
    const cat = categories.find((c) => c.id === catId)
    if (!cat) return { icon: "receipt_long", name: "--" }
    const iconName = CATEGORY_ICONS[cat.name] ?? "receipt_long"
    return { icon: iconName, name: cat.name }
  }

  const filtered = transactions
    .filter((t) => !filterCardId || t.card_id === filterCardId)
    .filter((t) => t.date.startsWith(selectedMonth))
    .filter((t) => filterType === "ALL" || t.type === filterType)

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = []
    acc[tx.date].push(tx)
    return acc
  }, {})

  const totalMonth = sorted.reduce((acc, tx) => {
    return acc + (tx.type === "INCOME" ? tx.amount : -tx.amount)
  }, 0)

  const realizedIncome = sorted.filter((t) => t.type === "INCOME" && t.is_realized).reduce((a, t) => a + t.amount, 0)
  const realizedExpenses = sorted.filter((t) => t.type === "EXPENSE" && t.is_realized).reduce((a, t) => a + t.amount, 0)
  const pendingIncome = sorted.filter((t) => t.type === "INCOME" && !t.is_realized).reduce((a, t) => a + t.amount, 0)
  const pendingExpenses = sorted.filter((t) => t.type === "EXPENSE" && !t.is_realized).reduce((a, t) => a + t.amount, 0)
  const realizedBalance = realizedIncome - realizedExpenses
  const pendingBalance = pendingIncome - pendingExpenses

  const recurringTxs = sorted.filter((t) => t.is_recurring)
  const scheduledTxs = sorted.filter((t) => t.is_scheduled && !t.is_realized)
  const recurringTotal = recurringTxs.reduce((a, t) => a + (t.type === "INCOME" ? t.amount : -t.amount), 0)
  const scheduledTotal = scheduledTxs.reduce((a, t) => a + (t.type === "INCOME" ? t.amount : -t.amount), 0)
  const filterCard = filterCardId ? cards.find((c) => c.id === filterCardId) : null
  const isCreditCardFilter = filterCard?.type === "CREDIT_CARD"

  const monthLabel = new Date(selectedMonth + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight">
            {filterCard ? getCardName(filterCard.id) : "Transacoes"}
          </h2>
          {filterCard ? (
            <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
              <span>{isCreditCardFilter ? "Fatura:" : "Saldo:"}</span>
              <span className={`font-bold ${isCreditCardFilter ? "text-error" : getCardBalance(filterCard.id) >= 0 ? "text-primary" : "text-error"}`}>
                <MoneyValue value={isCreditCardFilter ? getCardExpenses(filterCard.id) : getCardBalance(filterCard.id)} />
              </span>
              {isCreditCardFilter && filterCard.credit_limit && (
                <>
                  <span className="text-on-surface-variant/50">|</span>
                  <span>Limite: <MoneyValue value={filterCard.credit_limit} /></span>
                </>
              )}
            </p>
          ) : (
            <p className="text-on-surface-variant text-sm mt-1">Gerencie seus gastos e receitas</p>
          )}
        </div>
        <button
          onClick={() => { setEditingTx(null); setForm(defaultForm); setDialogOpen(true) }}
          className="flex items-center gap-2 p-3 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all atmos-shadow"
        >
          <Icon name="add_circle" className="text-lg" />
          <span className="hidden sm:inline">Nova Transacao</span>
        </button>
      </div>

      {/* Filters */}
      <section className="bg-surface-container-low rounded-xl p-4 ghost-border space-y-3">
        {/* Account filters */}
        {cards.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            <button
              onClick={() => setFilterCardId("")}
              className={`px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-colors ${
                !filterCardId
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              Todas
            </button>
            {cards.map((c) => {
              const bank = banks.find((b) => b.id === c.bank_id)
              const initials = (bank?.name ?? "--").slice(0, 2).toUpperCase()
              return (
                <button
                  key={c.id}
                  onClick={() => setFilterCardId(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                    filterCardId === c.id
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: bank?.color ?? "#666" }}
                  >
                    {initials}
                  </span>
                  {c.name}
                  <Icon name={c.type === "CREDIT_CARD" ? "credit_card" : "account_balance"} className="text-[14px] opacity-60" />
                </button>
              )
            })}
          </div>
        )}

      </section>

      {/* Month Picker + Type Filter */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button onClick={() => changeMonth(-1)} className="justify-self-start p-2 rounded-xl hover:bg-surface-container-high transition-colors">
          <Icon name="chevron_left" className="text-on-surface-variant" />
        </button>
        <h3 className="font-headline font-bold text-lg text-on-surface capitalize">{monthLabel}</h3>
        <button onClick={() => changeMonth(1)} className="justify-self-end p-2 rounded-xl hover:bg-surface-container-high transition-colors">
          <Icon name="chevron_right" className="text-on-surface-variant" />
        </button>
      </div>

      <div className="flex justify-center">
        <div className="flex gap-1 bg-surface-container-high rounded-full p-0.5">
          {([
            { value: "ALL", label: "Todas", icon: "swap_horiz" },
            { value: "EXPENSE", label: "Despesas", icon: "trending_down" },
            { value: "INCOME", label: "Receitas", icon: "trending_up" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                filterType === opt.value
                  ? opt.value === "EXPENSE" ? "bg-error text-white" : opt.value === "INCOME" ? "bg-income text-white" : "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <Icon name={opt.icon} className="text-[12px]" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Insights */}
      {sorted.length > 0 && (
        <section className="space-y-3">
          {/* Summary - styled like Dashboard Fluxo Mensal */}
          <div className="bg-surface-container-low rounded-xl p-6 ghost-border">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-headline font-bold text-base">{isCreditCardFilter ? "Fatura do Mes" : "Resumo do Mes"}</h3>
                <p className="text-[10px] text-on-surface-variant">{sorted.length} transacao(es) em {monthLabel}</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-income" />
                  <span className="text-[10px] font-medium text-on-surface-variant">Receitas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error" />
                  <span className="text-[10px] font-medium text-on-surface-variant">Despesas</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-high rounded-xl p-4 ghost-border">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-income-container/20 flex items-center justify-center">
                    <Icon name="trending_up" className="text-income text-sm" />
                  </div>
                  <p className="text-xs text-on-surface-variant">Receitas</p>
                </div>
                <p className="text-xl font-headline font-bold text-income"><MoneyValue value={realizedIncome} /></p>
                {pendingIncome > 0 && (
                  <p className="text-[10px] text-on-surface-variant mt-1">+ <MoneyValue value={pendingIncome} className="text-[10px]" /> previsto</p>
                )}
              </div>
              <div className="bg-surface-container-high rounded-xl p-4 ghost-border">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-error-container/20 flex items-center justify-center">
                    <Icon name="trending_down" className="text-error text-sm" />
                  </div>
                  <p className="text-xs text-on-surface-variant">Despesas</p>
                </div>
                <p className="text-xl font-headline font-bold text-error"><MoneyValue value={realizedExpenses} /></p>
                {pendingExpenses > 0 && (
                  <p className="text-[10px] text-on-surface-variant mt-1">+ <MoneyValue value={pendingExpenses} className="text-[10px]" /> previsto</p>
                )}
              </div>
            </div>

            {/* Realizado / Previsto / Total */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary-container/20 flex items-center justify-center">
                  <Icon name="check_circle" className="text-primary text-xs" />
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Realizado</p>
                  <p className={`text-sm font-headline font-bold ${isCreditCardFilter ? "text-error" : realizedBalance >= 0 ? "text-income" : "text-error"}`}>
                    <MoneyValue value={isCreditCardFilter ? realizedExpenses : realizedBalance} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-secondary-container/20 flex items-center justify-center">
                  <Icon name="schedule" className="text-secondary text-xs" />
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Previsto</p>
                  <p className={`text-sm font-headline font-bold ${isCreditCardFilter ? (pendingExpenses > 0 ? "text-error" : "text-on-surface") : pendingBalance >= 0 ? "text-income" : "text-error"}`}>
                    <MoneyValue value={isCreditCardFilter ? pendingExpenses : pendingBalance} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <Icon name="account_balance_wallet" className="text-on-surface text-xs" />
                </div>
                <div>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Total</p>
                  <p className={`text-sm font-headline font-bold ${isCreditCardFilter ? "text-error" : (realizedBalance + pendingBalance) >= 0 ? "text-income" : "text-error"}`}>
                    <MoneyValue value={isCreditCardFilter ? (realizedExpenses + pendingExpenses) : (realizedBalance + pendingBalance)} />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recurring + Scheduled */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setExpandedSection(expandedSection === "recurring" ? null : "recurring")}
              className={`p-4 rounded-2xl ghost-border text-left transition-colors ${expandedSection === "recurring" ? "bg-primary-container/10" : "bg-surface-container-low"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="repeat" className="text-base text-primary" />
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Recorrentes</span>
                <span className="text-xs text-on-surface-variant ml-auto">{recurringTxs.length}</span>
              </div>
              <p className={`text-lg font-headline font-bold ${recurringTotal >= 0 ? "text-income" : "text-error"}`}>
                <MoneyValue value={recurringTotal} />
              </p>
            </button>
            <button
              onClick={() => setExpandedSection(expandedSection === "scheduled" ? null : "scheduled")}
              className={`p-4 rounded-2xl ghost-border text-left transition-colors ${expandedSection === "scheduled" ? "bg-tertiary-container/10" : "bg-surface-container-low"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="schedule" className="text-base text-tertiary" />
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Agendados</span>
                <span className="text-xs text-on-surface-variant ml-auto">{scheduledTxs.length}</span>
              </div>
              <p className={`text-lg font-headline font-bold ${scheduledTotal >= 0 ? "text-income" : "text-error"}`}>
                <MoneyValue value={scheduledTotal} />
              </p>
            </button>
          </div>

          {/* Expanded: Recurring list */}
          {expandedSection === "recurring" && recurringTxs.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl ghost-border overflow-hidden">
              {recurringTxs.map((tx) => {
                const cat = getCategoryInfo(tx.category_id)
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Icon name={cat.icon} className="text-sm text-primary" />
                      <span className="text-sm text-on-surface">{tx.description}</span>
                    </div>
                    <span className={`text-sm font-bold ${tx.type === "INCOME" ? "text-income" : "text-error"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}<MoneyValue value={tx.amount} />
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Expanded: Scheduled list */}
          {expandedSection === "scheduled" && scheduledTxs.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl ghost-border overflow-hidden">
              {scheduledTxs.map((tx) => {
                const cat = getCategoryInfo(tx.category_id)
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Icon name={cat.icon} className="text-sm text-tertiary" />
                      <div>
                        <span className="text-sm text-on-surface">{tx.description}</span>
                        {tx.scheduled_date && <span className="text-[10px] text-on-surface-variant ml-2">{tx.scheduled_date}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${tx.type === "INCOME" ? "text-income" : "text-error"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}<MoneyValue value={tx.amount} />
                      </span>
                      <button
                        onClick={() => realizeTransaction(tx.id)}
                        title="Marcar como realizado"
                        className="rounded-full p-1 hover:bg-income-container/20 text-income transition-colors"
                      >
                        <Icon name="check_circle" className="text-base" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Transaction List */}
      {sorted.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 ghost-border flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
            <Icon name="receipt_long" className="text-3xl text-on-surface-variant" />
          </div>
          <p className="font-headline font-bold text-lg">Nenhuma transacao registrada</p>
          <p className="text-sm text-on-surface-variant mt-2">
            {cards.length === 0 ? "Primeiro adicione um cartao, depois crie transacoes" : "Adicione sua primeira transacao"}
          </p>
        </div>
      ) : (
        <section className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2 sticky top-16 bg-surface/80 backdrop-blur-md py-1.5 z-20">
                <h3 className="font-headline font-bold text-on-surface-variant text-xs tracking-[0.15em] uppercase">
                  {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                </h3>
              </div>
              <div className="space-y-0.5">
                {txs.map((tx) => {
                  const cat = getCategoryInfo(tx.category_id)
                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low transition-all duration-200"
                    >
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                        <Icon
                          name={cat.icon}
                          className={`text-lg ${tx.type === "INCOME" ? "text-income" : "text-primary"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-on-surface truncate">{tx.description}</p>
                          {tx.is_scheduled && !tx.is_realized && (
                            <span className="text-[9px] bg-tertiary-container/20 text-tertiary rounded-full px-1.5 py-px font-medium shrink-0">
                              Futuro
                            </span>
                          )}
                          {tx.is_recurring && (
                            <Icon name="repeat" className="text-xs text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-on-surface-variant truncate">
                          {cat.name} · {getCardName(tx.card_id)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <p className={`text-sm font-headline font-bold ${tx.type === "INCOME" ? "text-income" : "text-error"}`}>
                          {tx.type === "INCOME" ? "+" : "-"}<MoneyValue value={tx.amount} />
                        </p>
                        {tx.is_scheduled && !tx.is_realized && (
                          <button
                            onClick={() => realizeTransaction(tx.id)}
                            title="Marcar como realizado"
                            className="rounded-full p-1 hover:bg-income-container/20 text-income transition-colors"
                          >
                            <Icon name="check_circle" className="text-base" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(tx)}
                          className="rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-primary-container/20 text-on-surface-variant hover:text-primary transition-all"
                        >
                          <Icon name="edit" className="text-base" />
                        </button>
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all"
                        >
                          <Icon name="delete" className="text-base" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} title={editingTx ? "Editar Transacao" : "Nova Transacao"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hero: Type + Amount */}
          <div className="text-center space-y-3">
            <div className="inline-flex bg-surface-container-highest rounded-full p-1 gap-1">
              {(["EXPENSE", "INCOME"] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    form.type === t
                      ? t === "EXPENSE"
                        ? "bg-error-container/30 text-error"
                        : "bg-income-container/30 text-income"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {t === "EXPENSE" ? "Despesa" : "Receita"}
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-center gap-1 w-fit mx-auto">
              <span className={`text-3xl font-headline font-extrabold ${form.type === "EXPENSE" ? "text-error/60" : "text-income/60"}`}>R$</span>
              <input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                type="number"
                step="0.01"
                min="0.01"
                className="bg-transparent border-none text-left text-4xl font-headline font-extrabold text-on-surface placeholder:text-on-surface/20 focus:ring-0 focus:outline-none p-0"
                style={{ width: `${Math.max(3.5, (form.amount?.length || 0) + 1.5)}ch` }}
                required
              />
            </div>
          </div>

          {/* Description */}
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descricao (ex: Supermercado)"
            className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
            required
          />

          {/* Category chips */}
          <div className="space-y-1.5">
            <label className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1">Categoria</label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setForm({ ...form, category_id: "", custom_category_name: "" })}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !form.category_id
                    ? "bg-primary-container/20 text-primary border border-primary/20"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                Nenhuma
              </button>
              {categories.map((c) => {
                const iconName = CATEGORY_ICONS[c.name] ?? "receipt_long"
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, category_id: c.id, custom_category_name: "" })}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      form.category_id === c.id
                        ? "bg-primary-container/20 text-primary border border-primary/20"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                    }`}
                  >
                    <Icon name={iconName} className="text-sm" />
                    {c.name}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setForm({ ...form, category_id: "__other__", custom_category_name: "" })}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isOtherCategory
                    ? "bg-primary-container/20 text-primary border border-primary/20"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <Icon name="add" className="text-sm" />
                Outra
              </button>
            </div>
            {isOtherCategory && (
              <input
                value={form.custom_category_name}
                onChange={(e) => setForm({ ...form, custom_category_name: e.target.value })}
                placeholder="Nome da categoria"
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
                required
                autoFocus
              />
            )}
          </div>

          {/* Bento: Account + Date (create only) */}
          {!editingTx && <div className="grid grid-cols-2 gap-3">
            {/* Account Selector */}
            <div className="relative">
              <label className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1 mb-1 block">Conta</label>
              <input type="hidden" name="card_id" value={form.card_id} required />
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between bg-surface-container-highest rounded-xl px-3 py-2.5 text-sm text-on-surface"
              >
                {form.card_id ? (
                  (() => {
                    const selected = cards.find((c) => c.id === form.card_id)
                    const bank = banks.find((b) => b.id === selected?.bank_id)
                    return (
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          name={selected?.type === "CREDIT_CARD" ? "credit_card" : "account_balance"}
                          className="text-base shrink-0"
                          style={{ color: bank?.color || undefined }}
                        />
                        <span className="text-xs font-medium truncate">{bank?.name} {selected?.last_digits ? `*${selected.last_digits}` : ""}</span>
                      </div>
                    )
                  })()
                ) : (
                  <span className="text-xs text-on-surface-variant/40">Selecione</span>
                )}
                <Icon name="expand_more" className="text-on-surface-variant text-base shrink-0" />
              </button>

              {dropdownOpen && (
                <div ref={dropdownRef} className="absolute z-50 w-[calc(200%+0.75rem)] left-0 mt-1 bg-surface-container-high rounded-xl border border-outline-variant/15 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                  {cards.filter((c) => c.type === "CHECKING_ACCOUNT").length > 0 && (
                    <>
                      <div className="px-3 py-1.5 bg-surface-container text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                        <Icon name="account_balance" className="text-xs text-primary" />
                        Contas Correntes
                      </div>
                      {cards.filter((c) => c.type === "CHECKING_ACCOUNT").map((c) => {
                        const bank = banks.find((b) => b.id === c.bank_id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setForm({ ...form, card_id: c.id }); setDropdownOpen(false) }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-container-highest transition-colors ${form.card_id === c.id ? "bg-primary/10" : ""}`}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: bank?.color ? `${bank.color}20` : undefined }}
                            >
                              <Icon name="account_balance" className="text-base" style={{ color: bank?.color || undefined }} />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                              <span className="text-sm font-medium text-on-surface truncate w-full">{bank?.name} - {c.name}</span>
                              <span className="text-[10px] text-on-surface-variant">
                                Conta Corrente{c.last_digits ? ` • *${c.last_digits}` : ""}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                  {cards.filter((c) => c.type === "CREDIT_CARD").length > 0 && (
                    <>
                      <div className="px-3 py-1.5 bg-surface-container text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                        <Icon name="credit_card" className="text-xs text-tertiary" />
                        Cartoes de Credito
                      </div>
                      {cards.filter((c) => c.type === "CREDIT_CARD").map((c) => {
                        const bank = banks.find((b) => b.id === c.bank_id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setForm({ ...form, card_id: c.id }); setDropdownOpen(false) }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-container-highest transition-colors ${form.card_id === c.id ? "bg-primary/10" : ""}`}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: bank?.color ? `${bank.color}20` : undefined }}
                            >
                              <Icon name="credit_card" className="text-base" style={{ color: bank?.color || undefined }} />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                              <span className="text-sm font-medium text-on-surface truncate w-full">{bank?.name} - {c.name}</span>
                              <span className="text-[10px] text-on-surface-variant">
                                Cartao de Credito{c.last_digits ? ` • *${c.last_digits}` : ""}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1 mb-1 block">Data</label>
              <input
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                type="date"
                className="w-full bg-surface-container-highest border-none rounded-xl px-3 py-2.5 text-xs text-on-surface focus:ring-1 focus:ring-primary/50"
                required
              />
            </div>
          </div>}

          {/* Toggle chips: Parcelado | Agendado | Recorrente */}
          {!editingTx && <div className="flex gap-2">
            {([
              { key: "is_installment" as const, icon: "payments", label: "Parcelado", disabledBy: "is_recurring" as const },
              { key: "is_scheduled" as const, icon: "schedule", label: "Agendado", disabledBy: null },
              { key: "is_recurring" as const, icon: "repeat", label: "Recorrente", disabledBy: "is_installment" as const },
            ]).map(({ key, icon, label, disabledBy }) => {
              const isDisabled = disabledBy ? form[disabledBy] : false
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    const toggled = !form[key]
                    const updates: Record<string, unknown> = { [key]: toggled }
                    if (key === "is_installment" && !toggled) updates.installments = ""
                    if (key === "is_installment" && toggled) { updates.is_recurring = false }
                    if (key === "is_recurring" && toggled) { updates.is_installment = false; updates.installments = ""; updates.is_bill = true }
                    if (key === "is_recurring" && !toggled) { updates.is_bill = false }
                    setForm({ ...form, ...updates })
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isDisabled
                      ? "opacity-50 cursor-not-allowed bg-surface-container-high text-on-surface-variant"
                      : form[key]
                        ? "bg-primary-container/20 text-primary border border-primary/20"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  <Icon name={icon} className="text-sm" />
                  {label}
                </button>
              )
            })}
          </div>}

          {/* Conditional: Installments */}
          {!editingTx && form.is_installment && (
            <div className="flex items-center gap-3 bg-surface-container-high/50 rounded-xl px-4 py-2.5">
              <label className="text-xs text-on-surface-variant whitespace-nowrap">Parcelas:</label>
              <input
                value={form.installments}
                onChange={(e) => setForm({ ...form, installments: e.target.value })}
                placeholder="Ex: 10"
                type="number"
                min="2"
                max="48"
                className="flex-1 bg-transparent border-none text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-0 p-0"
                required
              />
              {form.amount && form.installments && Number(form.installments) >= 2 && (
                <span className="text-xs text-on-surface-variant whitespace-nowrap">
                  {Number(form.installments)}x {(Number(form.amount) / Number(form.installments)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              )}
            </div>
          )}

          {/* Conditional: Scheduled date */}
          {!editingTx && form.is_scheduled && (
            <div className="flex items-center gap-3 bg-surface-container-high/50 rounded-xl px-4 py-2.5">
              <Icon name="event" className="text-sm text-on-surface-variant" />
              <label className="text-xs text-on-surface-variant whitespace-nowrap">Data prevista:</label>
              <input
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                type="date"
                className="flex-1 bg-transparent border-none text-sm text-on-surface focus:ring-0 p-0"
              />
            </div>
          )}

          {/* Recurring info */}
          {!editingTx && form.is_recurring && (
            <div className="flex items-center gap-2 bg-primary-container/10 rounded-xl px-4 py-2.5">
              <Icon name="info" className="text-sm text-primary" />
              <span className="text-xs text-primary">Gera lancamentos para os proximos 24 meses</span>
            </div>
          )}

          {/* Notes */}
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observacoes (opcional)"
            rows={1}
            className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 resize-none"
          />

          {/* Bill checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_bill}
              onChange={(e) => setForm({ ...form, is_bill: e.target.checked })}
              className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/50"
            />
            <div>
              <p className="text-sm font-medium">Aparece nos vencimentos</p>
              <p className="text-[10px] text-on-surface-variant">Essa conta aparecera na tela de Vencimentos para controle de pagamento</p>
            </div>
          </label>

          {/* Cascade option for installment edit */}
          {editingTx && (() => {
            const tx = transactions.find((t) => t.id === editingTx)
            return tx && isInstallment(tx) ? (
              <label className="flex items-center gap-2.5 bg-tertiary-container/10 rounded-xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editCascade}
                  onChange={(e) => setEditCascade(e.target.checked)}
                  className="w-4 h-4 rounded border-none bg-surface-container-highest text-tertiary focus:ring-tertiary/30 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm font-medium text-on-surface">Aplicar a todas as parcelas</span>
                  <p className="text-[10px] text-on-surface-variant">Altera valor, descricao e categoria em todas as parcelas</p>
                </div>
              </label>
            ) : null
          })()}

          {/* Submit */}
          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl font-headline font-bold text-sm active:scale-[0.98] transition-all relative overflow-hidden group ${
              editingTx
                ? "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_8px_32px_rgba(0,92,186,0.3)]"
                : form.type === "EXPENSE"
                  ? "bg-gradient-to-br from-error to-error-container text-on-error shadow-[0_8px_32px_rgba(147,0,10,0.3)]"
                  : "bg-gradient-to-br from-income to-income-container text-on-income shadow-[0_8px_32px_rgba(0,94,42,0.3)]"
            }`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-center gap-2 relative z-10">
              <Icon name={editingTx ? "save" : "done_all"} />
              <span>{editingTx ? "Salvar Alteracoes" : form.type === "EXPENSE" ? "Registrar Despesa" : "Registrar Receita"}</span>
            </div>
          </button>
        </form>
      </Dialog>
    </div>
  )
}
