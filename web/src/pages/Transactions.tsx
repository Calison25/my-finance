import { useState, useRef, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import { FinancialSummaryCards } from "@/components/ui/FinancialSummaryCards"
import type { TransactionType } from "@/types"

function formatCentsToBRL(cents: number): string {
  if (cents === 0) return ""
  const reais = Math.floor(cents / 100)
  const centavos = cents % 100
  const reaisStr = reais.toLocaleString("pt-BR")
  return `${reaisStr},${String(centavos).padStart(2, "0")}`
}

function parseBRLToCents(formatted: string): number {
  const digits = formatted.replace(/\D/g, "")
  return digits ? parseInt(digits, 10) : 0
}

function parseBRLToNumber(formatted: string): number {
  return parseBRLToCents(formatted) / 100
}

function getDefaultDateForMonth(monthStr: string): string {
  const today = new Date()
  const [y, m] = monthStr.split("-").map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const day = Math.min(today.getDate(), lastDay)
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function formatDayHeader(dateStr: string): string {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`
  const d = new Date(dateStr + "T12:00:00")
  const dayMonth = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")
  if (dateStr === todayStr) return `Hoje · ${dayMonth}`
  if (dateStr === yesterdayStr) return `Ontem · ${dayMonth}`
  return `${dayMonth} · ${weekday}`
}

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
  const { transactions, cards, categories, banks, addTransaction, updateTransaction, deleteTransaction, deleteTransactionGroup, realizeTransaction, getCardBalance, valuesVisible, toggleValuesVisible } = useFinanceStore()
  const [deletePrompt, setDeletePrompt] = useState<{ id: string; kind: "recurring" | "installment" } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<string | null>(null)
  const [editCascade, setEditCascade] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const filterCardId = searchParams.get("card_id") ?? ""
  const filterCategoryId = searchParams.get("category_id") ?? ""
  const defaultMonth = (() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  })()
  const selectedMonth = searchParams.get("month") ?? defaultMonth
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    setSearchParams(params)
  }, [searchParams, setSearchParams])
  const setFilterCardId = (id: string) => updateParams({ card_id: id || null })
  const setFilterCategoryId = (id: string) => updateParams({ category_id: id || null })
  const setSelectedMonth = (m: string) => updateParams({ month: m })
  const [expandedSection, setExpandedSection] = useState<"recurring" | "scheduled" | "installments" | null>(null)
  const [filterType, setFilterType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL")
  const [categorySuggested, setCategorySuggested] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    card_id: "",
    description: "",
    amount: "",
    type: "EXPENSE" as TransactionType,
    category_id: "",
    custom_category_name: "",
    date: getDefaultDateForMonth(selectedMonth),
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

  const suggestCategoryFromDescription = useCallback((description: string) => {
    if (!description.trim()) {
      setCategorySuggested(false)
      return
    }
    const needle = description.trim().toLowerCase()
    const match = transactions.find(
      (t) => t.category_id && t.description.toLowerCase().includes(needle),
    )
    if (!match) {
      const reverseMatch = transactions.find(
        (t) => t.category_id && needle.includes(t.description.toLowerCase()),
      )
      if (reverseMatch?.category_id) {
        setForm((prev) => ({ ...prev, category_id: reverseMatch.category_id! }))
        setCategorySuggested(true)
        return
      }
      setCategorySuggested(false)
      return
    }
    setForm((prev) => ({ ...prev, category_id: match.category_id! }))
    setCategorySuggested(true)
  }, [transactions])

  function getBaseDescription(desc: string) {
    return desc.replace(/\s\(\d+\/\d+\)$/, "")
  }

  function openEdit(tx: typeof transactions[0]) {
    setEditingTx(tx.id)
    setEditCascade(false)
    setForm({
      card_id: tx.card_id,
      description: getBaseDescription(tx.description),
      amount: formatCentsToBRL(Math.round(tx.amount * 100)),
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
    setCategorySuggested(false)
    setValidationErrors({})
  }

  const defaultForm = {
    card_id: "",
    description: "",
    amount: "",
    type: "EXPENSE" as TransactionType,
    category_id: "",
    custom_category_name: "",
    date: getDefaultDateForMonth(selectedMonth),
    is_scheduled: false,
    scheduled_date: "",
    notes: "",
    is_installment: false,
    installments: "",
    is_recurring: false,
    is_bill: false,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    const amountNum = parseBRLToNumber(form.amount)
    const errors: Record<string, boolean> = {}
    if (!amountNum) errors.amount = true
    if (!form.description) errors.description = true
    if (!form.card_id) errors.card_id = true
    if (!form.category_id) errors.category = true
    if (isOtherCategory && !form.custom_category_name) errors.custom_category_name = true
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})
    setIsSubmitting(true)

    try {
      if (editingTx) {
        await updateTransaction(editingTx, {
          description: form.description,
          amount: amountNum,
          type: form.type,
          category_id: isOtherCategory ? null : (form.category_id || null),
          custom_category_name: isOtherCategory ? form.custom_category_name : undefined,
          notes: form.notes || null,
          is_recurring: form.is_recurring,
        }, editCascade)
      } else {
        await addTransaction({
          card_id: form.card_id,
          description: form.description,
          amount: amountNum,
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
    } finally {
      setIsSubmitting(false)
    }
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
    .filter((t) => !filterCategoryId || t.category_id === filterCategoryId)
    .filter((t) => t.date.startsWith(selectedMonth))
    .filter((t) => filterType === "ALL" || t.type === filterType)

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = []
    acc[tx.date].push(tx)
    return acc
  }, {})

  const todayKey = (() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
  })()
  const [openDayOverride, setOpenDayOverride] = useState<Record<string, boolean>>({})
  function isDayOpen(date: string) {
    if (date in openDayOverride) return openDayOverride[date]
    return date === todayKey
  }
  function toggleDay(date: string) {
    setOpenDayOverride((s) => ({ ...s, [date]: !isDayOpen(date) }))
  }

  const sumAmount = (arr: typeof sorted) => arr.reduce((acc, t) => acc + Number(t.amount), 0)
  const isEffectivelyRealized = (t: typeof sorted[0]) => {
    if (t.is_scheduled && !t.is_realized) return false
    return t.is_realized || t.is_recurring || t.classification === "installment"
  }

  const recurringTxs = filtered.filter((t) => t.classification === "recurring")
  const recurringIncomeTxs = recurringTxs.filter((t) => t.type === "INCOME")
  const recurringExpenseTxs = recurringTxs.filter((t) => t.type === "EXPENSE")
  const installmentTxs = filtered.filter((t) => t.classification === "installment")
  const installmentExpenseTxs = installmentTxs.filter((t) => t.type === "EXPENSE")
  const scheduledTxs = filtered.filter((t) => t.classification === "scheduled")

  const recurringIncomeTotal = sumAmount(recurringIncomeTxs)
  const recurringExpenseTotal = sumAmount(recurringExpenseTxs)
  const recurringTotal = recurringIncomeTotal - recurringExpenseTotal
  const installmentIncomeTotal = sumAmount(installmentTxs.filter((t) => t.type === "INCOME"))
  const installmentExpenseTotal = sumAmount(installmentExpenseTxs)
  const installmentTotal = installmentIncomeTotal - installmentExpenseTotal
  const scheduledIncomeTotal = sumAmount(scheduledTxs.filter((t) => t.type === "INCOME"))
  const scheduledExpenseTotal = sumAmount(scheduledTxs.filter((t) => t.type === "EXPENSE"))
  const scheduledTotal = scheduledIncomeTotal - scheduledExpenseTotal

  const totalIncome = sumAmount(filtered.filter((t) => t.type === "INCOME"))
  const realizedExpenses = sumAmount(filtered.filter((t) => t.type === "EXPENSE" && isEffectivelyRealized(t)))
  const scheduledExpenses = sumAmount(filtered.filter((t) => t.type === "EXPENSE" && t.is_scheduled && !t.is_realized))
  const totalExpenses = realizedExpenses + scheduledExpenses
  const financialSummary = {
    total_income: totalIncome,
    realized_expenses: realizedExpenses,
    scheduled_expenses: scheduledExpenses,
    total_expenses: totalExpenses,
    current_balance: totalIncome - realizedExpenses,
    projected_balance: totalIncome - totalExpenses,
  }

  const filterCard = filterCardId ? cards.find((c) => c.id === filterCardId) : null
  const isCreditCardFilter = filterCard?.type === "CREDIT_CARD"
  const cardHeaderExpenses = sumAmount(filtered.filter((t) => t.type === "EXPENSE"))

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
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold font-headline tracking-tight">
              {filterCard ? getCardName(filterCard.id) : "Transacoes"}
            </h2>
            <button
              onClick={toggleValuesVisible}
              className="opacity-40 hover:opacity-100 transition-opacity"
              title={valuesVisible ? "Ocultar valores" : "Mostrar valores"}
            >
              <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-base text-on-surface-variant" />
            </button>
          </div>
          {filterCard ? (
            <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
              <span>{isCreditCardFilter ? "Fatura:" : "Saldo:"}</span>
              <span className={`font-bold ${isCreditCardFilter ? "text-error" : getCardBalance(filterCard.id) >= 0 ? "text-primary" : "text-error"}`}>
                <MoneyValue value={isCreditCardFilter ? cardHeaderExpenses : getCardBalance(filterCard.id)} />
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

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            <button
              onClick={() => setFilterCategoryId("")}
              className={`px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-colors ${
                !filterCategoryId
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              Todas categorias
            </button>
            {categories.map((c) => {
              const iconName = CATEGORY_ICONS[c.name] ?? "receipt_long"
              const active = filterCategoryId === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setFilterCategoryId(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                    active
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  <Icon name={iconName} className="text-[14px]" />
                  {c.name}
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
          {/* Resumo Financeiro */}
          <FinancialSummaryCards summary={financialSummary} />

          {/* Recurring + Installments + Scheduled */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setExpandedSection(expandedSection === "recurring" ? null : "recurring")}
              className={`p-4 rounded-2xl ghost-border text-left transition-colors ${expandedSection === "recurring" ? "bg-primary-container/10" : "bg-surface-container-low"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="repeat" className="text-base text-primary" />
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Recorrentes</span>
                <span className="text-xs text-on-surface-variant ml-auto">{recurringTxs.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-lg font-headline font-bold ${recurringTotal >= 0 ? "text-income" : "text-error"}`}>
                  <MoneyValue value={recurringTotal} />
                </p>
                <div className="flex items-center gap-3">
                  {recurringIncomeTotal > 0 && (
                    <span className="text-[11px] text-income font-medium whitespace-nowrap">+<MoneyValue value={recurringIncomeTotal} /></span>
                  )}
                  {recurringExpenseTotal > 0 && (
                    <span className="text-[11px] text-error font-medium whitespace-nowrap">-<MoneyValue value={recurringExpenseTotal} /></span>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={() => setExpandedSection(expandedSection === "installments" ? null : "installments")}
              className={`p-4 rounded-2xl ghost-border text-left transition-colors ${expandedSection === "installments" ? "bg-secondary-container/10" : "bg-surface-container-low"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="payments" className="text-base text-secondary" />
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Parcelados</span>
                <span className="text-xs text-on-surface-variant ml-auto">{installmentTxs.length}</span>
              </div>
              <p className={`text-lg font-headline font-bold ${installmentTotal >= 0 ? "text-income" : "text-error"}`}>
                <MoneyValue value={installmentTotal} />
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
            <div className="space-y-3">
              {recurringIncomeTxs.length > 0 && (
                <div className="bg-surface-container-low rounded-2xl ghost-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-income/5 border-b border-outline-variant/10">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Icon name="trending_up" className="text-sm text-income shrink-0" />
                      <span className="text-[10px] sm:text-xs font-bold text-income uppercase tracking-wider truncate">Receitas recorrentes</span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-income whitespace-nowrap ml-2">+<MoneyValue value={recurringIncomeTotal} /></span>
                  </div>
                  {recurringIncomeTxs.map((tx) => {
                    const cat = getCategoryInfo(tx.category_id)
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-outline-variant/10 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon name={cat.icon} className="text-sm text-income shrink-0" />
                          <span className="text-sm text-on-surface truncate">{tx.description}</span>
                        </div>
                        <span className="text-sm font-bold text-income whitespace-nowrap ml-2">+<MoneyValue value={tx.amount} /></span>
                      </div>
                    )
                  })}
                </div>
              )}
              {recurringExpenseTxs.length > 0 && (
                <div className="bg-surface-container-low rounded-2xl ghost-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-error/5 border-b border-outline-variant/10">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Icon name="trending_down" className="text-sm text-error shrink-0" />
                      <span className="text-[10px] sm:text-xs font-bold text-error uppercase tracking-wider truncate">Despesas recorrentes</span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-error whitespace-nowrap ml-2">-<MoneyValue value={recurringExpenseTotal} /></span>
                  </div>
                  {recurringExpenseTxs.map((tx) => {
                    const cat = getCategoryInfo(tx.category_id)
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-outline-variant/10 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon name={cat.icon} className="text-sm text-error shrink-0" />
                          <span className="text-sm text-on-surface truncate">{tx.description}</span>
                        </div>
                        <span className="text-sm font-bold text-error whitespace-nowrap ml-2">-<MoneyValue value={tx.amount} /></span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Expanded: Installments list */}
          {expandedSection === "installments" && installmentTxs.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl ghost-border overflow-hidden">
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-secondary/5 border-b border-outline-variant/10">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Icon name="payments" className="text-sm text-secondary shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold text-secondary uppercase tracking-wider truncate">Parcelados do mes</span>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-error whitespace-nowrap ml-2">-<MoneyValue value={installmentExpenseTotal} /></span>
              </div>
              {installmentTxs.map((tx) => {
                const cat = getCategoryInfo(tx.category_id)
                return (
                  <div key={tx.id} className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-outline-variant/10 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon name={cat.icon} className="text-sm text-secondary shrink-0" />
                      <span className="text-sm text-on-surface truncate">{tx.description}</span>
                    </div>
                    <span className={`text-sm font-bold whitespace-nowrap ml-2 ${tx.type === "INCOME" ? "text-income" : "text-error"}`}>
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
          {Object.entries(grouped).map(([date, txs]) => {
            const open = isDayOpen(date)
            const dayIncome = txs.filter((t) => t.type === "INCOME").reduce((a, t) => a + Number(t.amount), 0)
            const dayExpense = txs.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + Number(t.amount), 0)
            const dayNet = dayIncome - dayExpense
            return (
            <div key={date}>
              <button
                type="button"
                onClick={() => toggleDay(date)}
                className="w-full flex items-center gap-3 mb-2 sticky top-16 bg-surface/85 backdrop-blur-md py-2 px-2 -mx-2 rounded-lg z-20 hover:bg-surface-container-low/60 transition-colors"
              >
                <Icon
                  name="expand_more"
                  className={`text-on-surface-variant text-base transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
                />
                <h3 className="font-headline font-bold text-on-surface text-xs tracking-[0.15em] uppercase flex-1 text-left">
                  {formatDayHeader(date)}
                </h3>
                <span className="text-[10px] text-on-surface-variant font-medium shrink-0">
                  {txs.length} lanç.
                </span>
                <span className={`text-xs font-headline font-bold shrink-0 ${dayNet >= 0 ? "text-income" : "text-error"}`}>
                  {dayNet >= 0 ? "+" : "-"}<MoneyValue value={Math.abs(dayNet)} />
                </span>
              </button>
              {open && (
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
                          onClick={() => {
                            if (tx.classification === "recurring") {
                              setDeletePrompt({ id: tx.id, kind: "recurring" })
                            } else if (tx.classification === "installment") {
                              setDeletePrompt({ id: tx.id, kind: "installment" })
                            } else {
                              deleteTransaction(tx.id)
                            }
                          }}
                          className="rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all"
                        >
                          <Icon name="delete" className="text-base" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}
            </div>
            )
          })}
        </section>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => { if (!isSubmitting) closeDialog() }} title={editingTx ? "Editar Transacao" : "Nova Transacao"}>
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
            <div className="flex flex-col items-center gap-1 w-fit mx-auto">
              <div className={`flex items-baseline justify-center gap-1 rounded-xl px-3 py-1 transition-all ${validationErrors.amount ? "ring-2 ring-error/60 bg-error/5" : ""}`}>
                <span className={`text-3xl font-headline font-extrabold ${form.type === "EXPENSE" ? "text-error/60" : "text-income/60"}`}>R$</span>
                <input
                  value={form.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "")
                    const cents = raw ? parseInt(raw, 10) : 0
                    setForm({ ...form, amount: formatCentsToBRL(cents) })
                    if (validationErrors.amount) setValidationErrors((v) => ({ ...v, amount: false }))
                  }}
                  placeholder="0,00"
                  inputMode="numeric"
                  className="bg-transparent border-none text-left text-4xl font-headline font-extrabold text-on-surface placeholder:text-on-surface/20 focus:ring-0 focus:outline-none p-0"
                  style={{ width: `${Math.max(3.5, (form.amount?.length || 0) + 1.5)}ch` }}
                  required
                />
              </div>
              {validationErrors.amount && <span className="text-[11px] text-error font-medium">Informe o valor</span>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <input
              value={form.description}
              onChange={(e) => {
                setForm({ ...form, description: e.target.value })
                setCategorySuggested(false)
                if (validationErrors.description) setValidationErrors((v) => ({ ...v, description: false }))
              }}
              onBlur={(e) => {
                if (!editingTx) suggestCategoryFromDescription(e.target.value)
              }}
              placeholder="Descricao (ex: Supermercado)"
              className={`w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 ${validationErrors.description ? "ring-1 ring-error/60 bg-error/5" : "focus:ring-primary/50"}`}
              required
            />
            {validationErrors.description && <span className="text-[11px] text-error font-medium px-1">Informe a descricao</span>}
          </div>

          {/* Category chips (obrigatório) */}
          <div className={`space-y-1.5 rounded-xl p-2 -mx-2 transition-all ${validationErrors.category ? "ring-2 ring-error/60 bg-error/5" : ""}`}>
            <label className="font-label text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1">
              Categoria <span className="text-error">*</span>
            </label>
            {!form.category_id && !validationErrors.category && (
              <p className="text-[10px] text-on-surface-variant/60 px-1">Selecione uma categoria</p>
            )}
            {validationErrors.category && (
              <p className="text-[11px] text-error font-medium px-1">Selecione uma categoria</p>
            )}
            {categorySuggested && form.category_id && !isOtherCategory && (
              <p className="text-[10px] text-primary/70 px-1 flex items-center gap-1">
                <Icon name="auto_awesome" className="text-xs" />
                Sugerido com base em transacoes anteriores
              </p>
            )}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => { setForm({ ...form, category_id: "__other__", custom_category_name: "" }); setCategorySuggested(false); if (validationErrors.category) setValidationErrors((v) => ({ ...v, category: false })) }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isOtherCategory
                    ? "bg-primary-container/20 text-primary border border-primary/20"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <Icon name="add" className="text-sm" />
                Outra
              </button>
              {categories.map((c) => {
                const iconName = CATEGORY_ICONS[c.name] ?? "receipt_long"
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setForm({ ...form, category_id: c.id, custom_category_name: "" }); setCategorySuggested(false); if (validationErrors.category) setValidationErrors((v) => ({ ...v, category: false })) }}
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
            </div>
            {isOtherCategory && (
              <div className="space-y-1">
                <input
                  value={form.custom_category_name}
                  onChange={(e) => {
                    setForm({ ...form, custom_category_name: e.target.value })
                    if (validationErrors.custom_category_name) setValidationErrors((v) => ({ ...v, custom_category_name: false }))
                  }}
                  placeholder="Nome da categoria"
                  className={`w-full bg-surface-container-highest border-none rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 ${validationErrors.custom_category_name ? "ring-1 ring-error/60 bg-error/5" : "focus:ring-primary/50"}`}
                  required
                  autoFocus
                />
                {validationErrors.custom_category_name && <span className="text-[11px] text-error font-medium px-1">Informe o nome da categoria</span>}
              </div>
            )}
          </div>

          {/* Bento: Account + Date (create only) */}
          {!editingTx && <div className="grid grid-cols-2 gap-3">
            {/* Account Selector */}
            <div className="relative">
              <label className={`font-label text-[10px] font-bold uppercase tracking-wider px-1 mb-1 block ${validationErrors.card_id ? "text-error" : "text-on-surface-variant"}`}>Conta {validationErrors.card_id && <span className="text-error">*</span>}</label>
              <input type="hidden" name="card_id" value={form.card_id} required />
              <button
                type="button"
                onClick={() => { setDropdownOpen(!dropdownOpen); if (validationErrors.card_id) setValidationErrors((v) => ({ ...v, card_id: false })) }}
                className={`w-full flex items-center justify-between bg-surface-container-highest rounded-xl px-3 py-2.5 text-sm text-on-surface ${validationErrors.card_id ? "ring-2 ring-error/60 bg-error/5" : ""}`}
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
                            onClick={() => { setForm({ ...form, card_id: c.id }); setDropdownOpen(false); if (validationErrors.card_id) setValidationErrors((v) => ({ ...v, card_id: false })) }}
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
                            onClick={() => { setForm({ ...form, card_id: c.id }); setDropdownOpen(false); if (validationErrors.card_id) setValidationErrors((v) => ({ ...v, card_id: false })) }}
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
                  {Number(form.installments)}x {(parseBRLToNumber(form.amount) / Number(form.installments)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
            return tx && tx.classification === "installment" ? (
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
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={`w-full py-3.5 rounded-xl font-headline font-bold text-sm active:scale-[0.98] transition-all relative overflow-hidden group disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-80 ${
              editingTx
                ? "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_8px_32px_rgba(0,92,186,0.3)]"
                : form.type === "EXPENSE"
                  ? "bg-gradient-to-br from-error to-error-container text-on-error shadow-[0_8px_32px_rgba(147,0,10,0.3)]"
                  : "bg-gradient-to-br from-income to-income-container text-on-income shadow-[0_8px_32px_rgba(0,94,42,0.3)]"
            }`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-center gap-2 relative z-10">
              {isSubmitting ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                    aria-hidden="true"
                  />
                  <span>{editingTx ? "Salvando..." : "Processando..."}</span>
                </>
              ) : (
                <>
                  <Icon name={editingTx ? "save" : "done_all"} />
                  <span>{editingTx ? "Salvar Alteracoes" : form.type === "EXPENSE" ? "Registrar Despesa" : "Registrar Receita"}</span>
                </>
              )}
            </div>
          </button>
        </form>
      </Dialog>

      <Dialog
        open={deletePrompt !== null}
        onClose={() => setDeletePrompt(null)}
        title={deletePrompt?.kind === "recurring" ? "Excluir transação recorrente" : "Excluir parcelamento"}
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            {deletePrompt?.kind === "recurring"
              ? "Deseja excluir todas as recorrências ou apenas desta em diante?"
              : "Deseja excluir todas as parcelas ou apenas desta em diante?"}
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!deletePrompt) return
                const p = deletePrompt
                setDeletePrompt(null)
                await deleteTransactionGroup(p.id, "future")
              }}
              className="w-full py-3 rounded-xl bg-surface-container-high text-on-surface font-medium text-sm hover:bg-surface-container-highest transition-colors"
            >
              Desta em diante
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!deletePrompt) return
                const p = deletePrompt
                setDeletePrompt(null)
                await deleteTransactionGroup(p.id, "all")
              }}
              className="w-full py-3 rounded-xl bg-error/10 text-error font-medium text-sm hover:bg-error/20 transition-colors"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setDeletePrompt(null)}
              className="w-full py-3 rounded-xl text-on-surface-variant text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
