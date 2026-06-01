import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import { toast } from "@/components/ui/Toast"
import type { TransactionType } from "@/types"

const CATEGORY_ICONS: Record<string, string> = {
  Alimentação: "restaurant",
  Transporte: "directions_car",
  Moradia: "home",
  Saúde: "health_and_safety",
  Educação: "school",
  Lazer: "movie",
  Compras: "shopping_bag",
  Serviços: "build",
  Investimentos: "trending_up",
  Outros: "receipt_long",
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

function fmtMonth(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

function formatDayHeader(dateStr: string): string {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`
  const d = new Date(dateStr + "T12:00:00")
  const dayMonth = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
  if (dateStr === todayStr) return `Hoje · ${dayMonth}`
  if (dateStr === yesterdayStr) return `Ontem · ${dayMonth}`
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" }).replace(".", "")
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${date} às ${time}`
}

function defaultCompetenceMonth(): string {
  const next = new Date()
  next.setMonth(next.getMonth() + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
}

function competenceDateFor(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number)
  const today = new Date()
  const lastDay = new Date(y, m, 0).getDate()
  const day = Math.min(today.getDate(), lastDay)
  return `${monthStr}-${String(day).padStart(2, "0")}`
}

type SrcKind = "all" | "account" | "card"

export function Transactions() {
  const {
    transactions,
    cards,
    categories,
    banks,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransactionGroup,
    realizeTransaction,
    unrealizeTransaction,
    ensureMonths,
  } = useFinanceStore()

  const [searchParams, setSearchParams] = useSearchParams()
  const filterCardId = searchParams.get("card_id") ?? ""
  const defaultMonth = defaultCompetenceMonth()
  const selectedMonth = searchParams.get("month") ?? defaultMonth
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v)
        else params.delete(k)
      }
      setSearchParams(params)
    },
    [searchParams, setSearchParams],
  )
  const setSelectedMonth = (m: string) => updateParams({ month: m })
  const setFilterCardId = (id: string) => updateParams({ card_id: id || null })

  const [filterType, setFilterType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL")
  const [srcKind, setSrcKind] = useState<SrcKind>("all")
  const [filterCategoryIds, setFilterCategoryIds] = useState<Set<string>>(new Set())
  const [filterClassification, setFilterClassification] = useState<"all" | "recurring" | "installment" | "scheduled">("all")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalKey, setModalKey] = useState(0) // remount on each open
  const [deletePrompt, setDeletePrompt] = useState<{ id: string; kind: "recurring" | "installment" } | null>(null)

  useEffect(() => { ensureMonths([selectedMonth]) }, [selectedMonth, ensureMonths])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (filtersOpen && filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [filtersOpen])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const [y, m] = selectedMonth.split("-").map(Number)
  const monthDate = new Date(y, m - 1, 1)
  function changeMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  function categoryOf(id: string | null) {
    if (!id) return null
    return categories.find((c) => c.id === id) ?? null
  }
  function cardOf(id: string) {
    return cards.find((c) => c.id === id) ?? null
  }
  function bankOfCard(cardId: string) {
    const card = cardOf(cardId)
    return card ? (banks.find((b) => b.id === card.bank_id) ?? null) : null
  }
  function categoryIcon(catId: string | null) {
    const c = categoryOf(catId)
    if (!c) return "receipt_long"
    return CATEGORY_ICONS[c.name] ?? c.icon ?? "receipt_long"
  }

  const baseFiltered = useMemo(() => {
    const needle = searchText.trim().toLowerCase()
    return transactions
      .filter((t) => t.date.startsWith(selectedMonth))
      .filter((t) => filterType === "ALL" || t.type === filterType)
      .filter((t) => {
        if (srcKind === "all") return true
        const c = cardOf(t.card_id)
        if (!c) return true
        return srcKind === "card" ? c.type === "CREDIT_CARD" : c.type === "CHECKING_ACCOUNT"
      })
      .filter((t) => !filterCardId || t.card_id === filterCardId)
      .filter((t) => filterCategoryIds.size === 0 || (t.category_id && filterCategoryIds.has(t.category_id)))
      .filter((t) => {
        if (!needle) return true
        if (t.description.toLowerCase().includes(needle)) return true
        const amountStr = t.amount.toFixed(2)
        const amountBR = amountStr.replace(".", ",")
        const needleNum = needle.replace(/\./g, "").replace(",", ".")
        if (amountStr.includes(needleNum)) return true
        if (amountBR.includes(needle)) return true
        return false
      })
  }, [transactions, selectedMonth, filterType, srcKind, filterCardId, filterCategoryIds, searchText, cards])

  const lastCreatedInMonth = useMemo(() => {
    const monthTxs = transactions.filter((t) => t.date.startsWith(selectedMonth))
    if (monthTxs.length === 0) return null
    return monthTxs.reduce((latest, t) =>
      (t.created_at ?? "") > (latest.created_at ?? "") ? t : latest
    )
  }, [transactions, selectedMonth])

  const filtered = useMemo(() => baseFiltered.filter((t) => {
    if (filterClassification === "all") return true
    if (filterClassification === "recurring") return t.is_recurring || t.classification === "recurring"
    if (filterClassification === "installment") return t.classification === "installment"
    if (filterClassification === "scheduled") return t.is_scheduled && !t.is_realized
    return true
  }), [baseFiltered, filterClassification])

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered])

  const summary = useMemo(() => {
    const src = baseFiltered
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
    const saldoProjetado = receita - despesasTotal

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
      saldoProjetado,
      recurringCount: recurring.length,
      recurringIncome,
      recurringExpense,
      recurringNet: recurringIncome - recurringExpense,
      installmentCount: installments.length,
      installmentTotal,
      scheduledCount: scheduled.length,
      scheduledTotal,
    }
  }, [baseFiltered])

  const grouped = useMemo(() => {
    const acc: Record<string, typeof sorted> = {}
    for (const tx of sorted) {
      if (!acc[tx.date]) acc[tx.date] = []
      acc[tx.date].push(tx)
    }
    return acc
  }, [sorted])

  const todayKey = (() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
  })()
  const [openDay, setOpenDay] = useState<Record<string, boolean>>({})
  function isDayOpen(date: string) {
    if (searchText.trim()) return true // auto-expand when searching
    if (date in openDay) return openDay[date]
    return date === todayKey
  }
  function toggleDay(date: string) {
    setOpenDay((s) => ({ ...s, [date]: !isDayOpen(date) }))
  }

  const activeFilterCount =
    (filterType !== "ALL" ? 1 : 0) +
    (srcKind !== "all" ? 1 : 0) +
    (filterCardId ? 1 : 0) +
    filterCategoryIds.size +
    (filterClassification !== "all" ? 1 : 0)

  function clearAllFilters() {
    setFilterType("ALL")
    setSrcKind("all")
    setFilterCardId("")
    setFilterCategoryIds(new Set())
    setFilterClassification("all")
  }

  const classificationLabel: Record<typeof filterClassification, string> = {
    all: "",
    recurring: "Recorrentes",
    installment: "Parcelados",
    scheduled: "Agendados",
  }

  function toggleCategoryFilter(id: string) {
    setFilterCategoryIds((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openCreate() {
    setEditingId(null)
    setModalKey((k) => k + 1)
    setDialogOpen(true)
  }
  function openEdit(id: string) {
    setEditingId(id)
    setModalKey((k) => k + 1)
    setDialogOpen(true)
  }

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Transações</h1></div>
        <div className="actions">
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon name="add" className="text-[14px]" /> Nova transação
          </button>
        </div>
      </div>

      {/* Toolbar: [month-nav]  [search] [filtros] */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div className="month-nav">
          <button onClick={() => changeMonth(-1)}>
            <Icon name="chevron_left" className="text-[14px]" />
          </button>
          <span className="month-label">{fmtMonth(monthDate)}</span>
          <button onClick={() => changeMonth(1)}>
            <Icon name="chevron_right" className="text-[14px]" />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className={`search ${searchOpen || searchText ? "expanded" : "collapsed"} ${searchText ? "has-query" : ""}`}
               onClick={() => !searchOpen && setSearchOpen(true)}>
            <Icon name="search" className="search-icon" />
            <input
              ref={searchRef}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onBlur={() => { if (!searchText) setSearchOpen(false) }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setSearchText(""); setSearchOpen(false); searchRef.current?.blur() }
              }}
              placeholder="Buscar transação..."
            />
            {searchText && (
              <button className="search-clear" onClick={(e) => { e.stopPropagation(); setSearchText("") }}>
                <Icon name="close" className="text-[12px]" />
              </button>
            )}
          </div>

          <div ref={filtersRef} style={{ position: "relative" }}>
            <button
              className={`btn btn-secondary ${activeFilterCount > 0 ? "active" : ""}`}
              onClick={() => setFiltersOpen((s) => !s)}
            >
              <Icon name="tune" className="text-[14px]" /> Filtros
              {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
            </button>
            {filtersOpen && (
              <div className="filter-popover" style={{ padding: 12 }}>
                <div className="modal-section">
                  <div className="modal-section-head">Tipo</div>
                  <div className="seg-control">
                    {([
                      { v: "ALL", l: "Todas" },
                      { v: "EXPENSE", l: "Despesas" },
                      { v: "INCOME", l: "Receitas" },
                    ] as const).map((o) => (
                      <button key={o.v} className={filterType === o.v ? "active" : ""} onClick={() => setFilterType(o.v)}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-section">
                  <div className="modal-section-head">Origem</div>
                  <div className="seg-control" style={{ marginBottom: 8 }}>
                    {([
                      { v: "all", l: "Todas" },
                      { v: "account", l: "Conta" },
                      { v: "card", l: "Cartão" },
                    ] as const).map((o) => (
                      <button key={o.v} className={srcKind === o.v ? "active" : ""}
                              onClick={() => { setSrcKind(o.v); setFilterCardId("") }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                  <div className="popover-list" style={{ maxHeight: 160, overflowY: "auto" }}>
                    <button className={`popover-item ${!filterCardId ? "active" : ""}`} onClick={() => setFilterCardId("")}>
                      <span className="popover-item-label">Todas as origens</span>
                    </button>
                    {cards
                      .filter((c) => srcKind === "all" || (srcKind === "card" ? c.type === "CREDIT_CARD" : c.type === "CHECKING_ACCOUNT"))
                      .map((c) => {
                        const bank = banks.find((b) => b.id === c.bank_id)
                        return (
                          <button
                            key={c.id}
                            className={`popover-item ${filterCardId === c.id ? "active" : ""}`}
                            onClick={() => setFilterCardId(c.id)}
                          >
                            <div className="bi sm" style={{ background: bank?.color ?? "var(--c-porto)" }}>
                              {bank?.name?.slice(0, 2).toUpperCase() ?? "?"}
                            </div>
                            <span className="popover-item-label">{c.name}</span>
                          </button>
                        )
                      })}
                  </div>
                </div>

                <div className="modal-section">
                  <div className="modal-section-head">Categorias</div>
                  <div className="popover-list" style={{ maxHeight: 160, overflowY: "auto" }}>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        className={`popover-item ${filterCategoryIds.has(c.id) ? "active" : ""}`}
                        onClick={() => toggleCategoryFilter(c.id)}
                      >
                        <Icon name={CATEGORY_ICONS[c.name] ?? c.icon ?? "receipt_long"} className="text-[14px]" />
                        <span className="popover-item-label">{c.name}</span>
                        {filterCategoryIds.has(c.id) && <Icon name="check" className="text-[14px]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={clearAllFilters}>Limpar</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setFiltersOpen(false)}>Aplicar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active filter tokens */}
      {activeFilterCount > 0 && (
        <div className="chip-row" style={{ marginBottom: 14 }}>
          {filterType !== "ALL" && (
            <span className="filter-token">
              {filterType === "EXPENSE" ? "Despesas" : "Receitas"}
              <button onClick={() => setFilterType("ALL")}><Icon name="close" className="text-[12px]" /></button>
            </span>
          )}
          {srcKind !== "all" && (
            <span className="filter-token">
              {srcKind === "card" ? "Só cartões" : "Só contas"}
              <button onClick={() => setSrcKind("all")}><Icon name="close" className="text-[12px]" /></button>
            </span>
          )}
          {filterCardId && (
            <span className="filter-token">
              {cardOf(filterCardId)?.name}
              <button onClick={() => setFilterCardId("")}><Icon name="close" className="text-[12px]" /></button>
            </span>
          )}
          {filterClassification !== "all" && (
            <span className="filter-token">
              {classificationLabel[filterClassification]}
              <button onClick={() => setFilterClassification("all")}><Icon name="close" className="text-[12px]" /></button>
            </span>
          )}
          {[...filterCategoryIds].map((id) => {
            const cat = categoryOf(id)
            return (
              <span key={id} className="filter-token">
                {cat?.name ?? "Categoria"}
                <button onClick={() => toggleCategoryFilter(id)}><Icon name="close" className="text-[12px]" /></button>
              </span>
            )
          })}
          <button className="btn btn-ghost btn-sm" onClick={clearAllFilters}>Limpar tudo</button>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            <div className="kpi">
              <div className="kpi-label"><Icon name="trending_up" className="text-[12px]" />Receita</div>
              <div className="kpi-value positive"><MoneyValue value={summary.receita} /></div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><Icon name="trending_down" className="text-[12px]" />Despesas</div>
              <div className="kpi-value negative"><MoneyValue value={summary.despesasTotal} /></div>
              {summary.despesasPrevistas > 0 && (
                <div className="kpi-meta">
                  Previstas: <span className="num" style={{ color: "var(--negative)" }}><MoneyValue value={summary.despesasPrevistas} /></span>
                </div>
              )}
            </div>
            <div className="kpi">
              <div className="kpi-label"><Icon name="account_balance" className="text-[12px]" />Saldo Atual</div>
              <div className={`kpi-value ${summary.saldoAtual >= 0 ? "positive" : "negative"}`}>
                <MoneyValue value={summary.saldoAtual} />
              </div>
              <div className="kpi-meta">Receita - despesas realizadas</div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><Icon name="savings" className="text-[12px]" />Saldo Projetado</div>
              <div className={`kpi-value ${summary.saldoProjetado >= 0 ? "positive" : "negative"}`}>
                <MoneyValue value={summary.saldoProjetado} />
              </div>
              <div className="kpi-meta">Quanto ainda posso gastar</div>
            </div>
          </div>

          <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 20 }}>
            <div
              className={`kpi ${filterClassification === "recurring" ? "kpi-active" : ""}`}
              role="button"
              onClick={() => setFilterClassification((c) => c === "recurring" ? "all" : "recurring")}
              style={{ cursor: "pointer" }}
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
              className={`kpi ${filterClassification === "installment" ? "kpi-active" : ""}`}
              role="button"
              onClick={() => setFilterClassification((c) => c === "installment" ? "all" : "installment")}
              style={{ cursor: "pointer" }}
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
              className={`kpi ${filterClassification === "scheduled" ? "kpi-active" : ""}`}
              role="button"
              onClick={() => setFilterClassification((c) => c === "scheduled" ? "all" : "scheduled")}
              style={{ cursor: "pointer" }}
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
        </>
      )}

      {lastCreatedInMonth && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            marginBottom: 10,
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

      {sorted.length === 0 ? (
        <div className="panel empty">
          <div className="empty-title">Nenhuma transação encontrada</div>
          <p>Ajuste os filtros ou adicione uma transação.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: "0 8px" }}>
          {Object.entries(grouped).map(([date, txs]) => {
            const open = isDayOpen(date)
            const dayIncome = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0)
            const dayExpense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0)
            const net = dayIncome - dayExpense
            return (
              <div key={date} className={`day-group ${open ? "" : "collapsed"}`}>
                <div className="day-header" onClick={() => toggleDay(date)}>
                  <div className="day-date">
                    <Icon name="expand_more" className="day-caret text-[14px]" />
                    {formatDayHeader(date)}
                  </div>
                  <div className="day-meta">
                    <span>{txs.length} lanç.</span>
                    <span className="num" style={{ color: net >= 0 ? "var(--positive)" : "var(--negative)" }}>
                      {net >= 0 ? "+" : "-"}<MoneyValue value={Math.abs(net)} />
                    </span>
                  </div>
                </div>
                {open && (
                  <div>
                    {txs.map((tx) => {
                      const cat = categoryOf(tx.category_id)
                      const bank = bankOfCard(tx.card_id)
                      const card = cardOf(tx.card_id)
                      return (
                        <div
                          key={tx.id}
                          className="tx-row"
                          onClick={() => openEdit(tx.id)}
                          style={{ gridTemplateColumns: "28px 1fr auto auto" }}
                        >
                          <div className="tx-icon" style={cat ? { background: cat.color, color: "#fff" } : undefined}>
                            <Icon name={categoryIcon(tx.category_id)} className="text-[13px]" />
                          </div>
                          <div className="tx-main">
                            <div className="tx-title">
                              {tx.description}
                              {tx.is_recurring && <Icon name="repeat" className="text-[10px]" style={{ marginLeft: 4, color: "var(--accent)" }} />}
                              {tx.is_scheduled && !tx.is_realized && <Icon name="schedule" className="text-[10px]" style={{ marginLeft: 4, color: "var(--warning)" }} />}
                              {tx.transaction_date && (
                                <span
                                  title="Data real do evento"
                                  style={{
                                    marginLeft: 8,
                                    padding: "2px 6px",
                                    fontSize: 10,
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                                    color: "var(--accent)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    verticalAlign: "middle",
                                  }}
                                >
                                  <Icon name="event" className="text-[10px]" />
                                  {new Date(tx.transaction_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
                                </span>
                              )}
                            </div>
                            <div className="tx-sub">
                              <span>{cat?.name ?? "Outros"}</span>
                              <span className="dot" />
                              <span>{bank?.name ?? ""} {card?.name ?? ""}</span>
                            </div>
                          </div>
                          <div className={`tx-amount ${tx.type === "INCOME" ? "positive" : "negative"} ${tx.is_scheduled && !tx.is_realized ? "scheduled" : ""}`}>
                            {tx.type === "INCOME" ? "+" : "-"}<MoneyValue value={tx.amount} />
                          </div>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button
                              className="icon-btn"
                              style={{ width: 28, height: 28, color: tx.is_realized ? "var(--positive)" : "var(--text-3)" }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (tx.is_realized) unrealizeTransaction(tx.id)
                                else realizeTransaction(tx.id)
                              }}
                              title={tx.is_realized ? "Desmarcar como realizado" : "Marcar como realizado"}
                            >
                              <Icon name={tx.is_realized ? "check_circle" : "radio_button_unchecked"} className="text-[14px]" />
                            </button>
                            <button
                              className="icon-btn"
                              style={{ width: 28, height: 28, color: "var(--negative)" }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (tx.classification === "recurring") setDeletePrompt({ id: tx.id, kind: "recurring" })
                                else if (tx.classification === "installment") setDeletePrompt({ id: tx.id, kind: "installment" })
                                else if (confirm("Excluir esta transação?")) deleteTransaction(tx.id)
                              }}
                            >
                              <Icon name="delete" className="text-[13px]" />
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
        </div>
      )}

      {dialogOpen && (
        <TransactionModal
          key={modalKey}
          editingId={editingId}
          defaultMonth={selectedMonth}
          onClose={() => { setDialogOpen(false); setEditingId(null) }}
          onSaved={() => { setDialogOpen(false); setEditingId(null) }}
          transactions={transactions}
          cards={cards}
          categories={categories}
          banks={banks}
          addTransaction={addTransaction}
          updateTransaction={updateTransaction}
        />
      )}

      <Dialog
        open={deletePrompt !== null}
        onClose={() => setDeletePrompt(null)}
        title={deletePrompt?.kind === "recurring" ? "Excluir recorrente" : "Excluir parcelamento"}
      >
        <p style={{ marginBottom: 16 }}>
          {deletePrompt?.kind === "recurring"
            ? "Deseja excluir todas as recorrências ou apenas desta em diante?"
            : "Deseja excluir todas as parcelas ou apenas desta em diante?"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn btn-secondary" onClick={async () => {
            if (!deletePrompt) return
            const p = deletePrompt
            setDeletePrompt(null)
            await toast.run("Excluindo...", () => deleteTransactionGroup(p.id, "future"), "Excluídas a partir desta")
          }}>Desta em diante</button>
          <button className="btn btn-danger" onClick={async () => {
            if (!deletePrompt) return
            const p = deletePrompt
            setDeletePrompt(null)
            await toast.run("Excluindo todas...", () => deleteTransactionGroup(p.id, "all"), "Todas excluídas")
          }}>Todas</button>
          <button className="btn btn-ghost" onClick={() => setDeletePrompt(null)}>Cancelar</button>
        </div>
      </Dialog>
    </div>
  )
}

import type { Transaction, Card, Category, Bank } from "@/types"

interface TxModalProps {
  editingId: string | null
  defaultMonth: string
  onClose: () => void
  onSaved: () => void
  transactions: Transaction[]
  cards: Card[]
  categories: Category[]
  banks: Bank[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addTransaction: (data: any) => Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTransaction: (id: string, data: any, cascade?: boolean) => Promise<void>
}

function TransactionModal(props: TxModalProps) {
  const { editingId, defaultMonth, onClose, onSaved, transactions, cards, categories, banks, addTransaction, updateTransaction } = props
  const existing = editingId ? transactions.find((t) => t.id === editingId) ?? null : null

  function baseDesc(d: string) { return d.replace(/\s\(\d+\/\d+\)$/, "") }

  const [type, setType] = useState<TransactionType>(existing?.type ?? "EXPENSE")
  const [amount, setAmount] = useState(existing ? formatCentsToBRL(Math.round(existing.amount * 100)) : "")
  const [description, setDescription] = useState(existing ? baseDesc(existing.description) : "")
  const [srcKind, setSrcKind] = useState<"account" | "card">(() => {
    if (existing) {
      const c = cards.find((x) => x.id === existing.card_id)
      return c?.type === "CREDIT_CARD" ? "card" : "account"
    }
    return "card"
  })
  const [cardId, setCardId] = useState(existing?.card_id ?? "")
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "")
  const [customCategoryName, setCustomCategoryName] = useState("")
  const [competence, setCompetence] = useState(() => {
    if (existing) return existing.date.slice(0, 7)
    return defaultMonth
  })
  const [hasTxDate, setHasTxDate] = useState(!!existing?.transaction_date)
  const [transactionDate, setTransactionDate] = useState(existing?.transaction_date ?? "")
  const [isScheduled, setIsScheduled] = useState(existing?.is_scheduled ?? false)
  const [scheduledDate, setScheduledDate] = useState(existing?.scheduled_date ?? "")
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState("")
  const [isRecurring, setIsRecurring] = useState(existing?.is_recurring ?? false)
  const [isBill, setIsBill] = useState(existing?.is_bill ?? false)
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [editCascade, setEditCascade] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (type === "INCOME" && srcKind === "card") setSrcKind("account")
  }, [type, srcKind])

  const autoCategoryRef = useRef<string | null>(null)
  useEffect(() => {
    if (editingId) return
    const desc = description.trim().toLowerCase()
    if (!desc) return
    if (categoryId && categoryId !== autoCategoryRef.current) return
    const match = transactions.find((t) => baseDesc(t.description).trim().toLowerCase() === desc && t.category_id)
    if (match && match.category_id && match.category_id !== categoryId) {
      setCategoryId(match.category_id)
      autoCategoryRef.current = match.category_id
    }
  }, [description, transactions, editingId, categoryId])

  const filteredSrcCards = cards.filter((c) => srcKind === "card" ? c.type === "CREDIT_CARD" : c.type === "CHECKING_ACCOUNT")
  const isOtherCategory = categoryId === "__other__"

  const competenceLabel = (() => {
    const [y, m] = competence.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const amountNum = parseBRLToNumber(amount)
    if (!amountNum || !description || (!editingId && !cardId) || !categoryId || (isOtherCategory && !customCategoryName)) {
      toast.error("Preencha os campos obrigatórios")
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await toast.run("Salvando...", () => updateTransaction(editingId, {
          description,
          amount: amountNum,
          type,
          category_id: isOtherCategory ? null : (categoryId || null),
          custom_category_name: isOtherCategory ? customCategoryName : undefined,
          notes: notes || null,
          is_recurring: isRecurring,
          transaction_date: hasTxDate && transactionDate ? transactionDate : null,
        }, editCascade), "Transação atualizada")
      } else {
        await toast.run("Criando transação...", () => addTransaction({
          card_id: cardId,
          description,
          amount: amountNum,
          type,
          category_id: isOtherCategory ? undefined : (categoryId || undefined),
          custom_category_name: isOtherCategory ? customCategoryName : undefined,
          date: competenceDateFor(competence),
          transaction_date: hasTxDate && transactionDate ? transactionDate : undefined,
          is_scheduled: isScheduled,
          scheduled_date: isScheduled ? (scheduledDate || competenceDateFor(competence)) : undefined,
          notes: notes || undefined,
          installments: isInstallment && installments ? Number(installments) : undefined,
          is_recurring: isRecurring || undefined,
          is_bill: isBill || undefined,
        }), "Transação criada")
      }
      onSaved()
    } catch {} finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose} title={editingId ? "Editar transação" : "Nova transação"}>
      <form onSubmit={handleSubmit}>
        {/* Type toggle */}
        <div className="type-toggle">
          {(["EXPENSE", "INCOME"] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`${type === t ? "active" : ""} ${t === "EXPENSE" ? "despesa" : "receita"}`}
            >
              {t === "EXPENSE" ? "Despesa" : "Receita"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="field">
          <input
            className={`input input-amount ${type === "EXPENSE" ? "despesa" : "receita"}`}
            value={amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              const cents = raw ? parseInt(raw, 10) : 0
              setAmount(formatCentsToBRL(cents))
            }}
            placeholder="0,00"
            inputMode="numeric"
          />
        </div>

        {/* Description */}
        <div className="field">
          <label className="label">Descrição <span className="req">*</span></label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Supermercado" required />
        </div>

        {/* Source: tabs + list */}
        {!editingId && (
          <div className="modal-section">
            <div className="modal-section-head">Pagar com <span style={{ color: "var(--negative)" }}>*</span></div>
            <div className="src-block">
              <div className="src-tabs">
                <button type="button" className={`src-tab ${srcKind === "account" ? "active" : ""}`}
                        onClick={() => { setSrcKind("account"); setCardId("") }} disabled={type === "INCOME" ? false : false}>
                  <Icon name="account_balance" className="text-[14px]" /> Conta
                </button>
                <button type="button" className={`src-tab ${srcKind === "card" ? "active" : ""}`}
                        onClick={() => { setSrcKind("card"); setCardId("") }} disabled={type === "INCOME"}>
                  <Icon name="credit_card" className="text-[14px]" /> Cartão
                </button>
              </div>
              <div className="src-list-inner">
                {filteredSrcCards.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
                    Nenhuma {srcKind === "card" ? "cartão" : "conta"} cadastrada
                  </div>
                ) : (
                  filteredSrcCards.map((c) => {
                    const bank = banks.find((b) => b.id === c.bank_id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`src-item ${cardId === c.id ? "active" : ""}`}
                        onClick={() => setCardId(c.id)}
                      >
                        <div className="bi sm" style={{ background: bank?.color ?? "var(--c-porto)" }}>
                          {bank?.name?.slice(0, 2).toUpperCase() ?? "?"}
                        </div>
                        <span className="src-name">{c.name}</span>
                        <span className="src-trailing" style={{ color: "var(--text-3)" }}>{bank?.name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category */}
        <div className="field">
          <label className="label">Categoria <span className="req">*</span></label>
          <div className="cat-pills">
            <button
              type="button"
              className={`cat-pill ${isOtherCategory ? "active" : ""}`}
              onClick={() => setCategoryId("__other__")}
            >
              <Icon name="add" className="text-[12px]" /> Outra
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cat-pill ${categoryId === c.id ? "active" : ""}`}
                onClick={() => setCategoryId(c.id)}
              >
                <Icon name={CATEGORY_ICONS[c.name] ?? c.icon ?? "receipt_long"} className="text-[12px]" />
                {c.name}
              </button>
            ))}
          </div>
          {isOtherCategory && (
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Nome da nova categoria"
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              autoFocus
              required
            />
          )}
        </div>

        {/* Competence + transaction date */}
        <div className="field">
          <label className="label">Mês de competência <span className="req">*</span></label>
          <input
            type="month"
            className="input"
            value={competence}
            onChange={(e) => setCompetence(e.target.value)}
            required
          />
          <span className="help">A transação aparecerá em <strong>{competenceLabel}</strong></span>
        </div>
        <div className="field">
          <label className="label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={hasTxDate}
              onChange={(e) => setHasTxDate(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Data real da transação (opcional)
          </label>
          {hasTxDate && (
            <>
              <input
                type="date"
                className="input"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                style={{ marginTop: 6 }}
              />
              <span className="help">Use quando o evento ocorreu fora do mês de competência (ex: compra antiga cobrada agora)</span>
            </>
          )}
        </div>

        {/* Option pills */}
        {!editingId && (
          <div className="field">
            <div className="opt-pills">
              <button
                type="button"
                className={`opt-pill ${isInstallment ? "active" : ""}`}
                disabled={isRecurring}
                onClick={() => setIsInstallment((s) => !s)}
              >
                <Icon name="payments" className="text-[12px]" /> Parcelado
              </button>
              <button
                type="button"
                className={`opt-pill ${isScheduled ? "active" : ""}`}
                onClick={() => setIsScheduled((s) => !s)}
              >
                <Icon name="schedule" className="text-[12px]" /> Agendado
              </button>
              <button
                type="button"
                className={`opt-pill ${isRecurring ? "active" : ""}`}
                disabled={isInstallment}
                onClick={() => setIsRecurring((s) => !s)}
              >
                <Icon name="repeat" className="text-[12px]" /> Recorrente
              </button>
            </div>
          </div>
        )}

        {!editingId && isInstallment && (
          <div className="field">
            <label className="label">Parcelas (2–48)</label>
            <input className="input" type="number" min={2} max={48} value={installments} onChange={(e) => setInstallments(e.target.value)} placeholder="Ex: 10" />
            {(() => {
              const total = parseBRLToNumber(amount)
              const n = Number(installments)
              if (!total || !n || n < 2) return null
              const per = total / n
              const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              return (
                <span className="help">
                  {fmt(total)} em <strong>{n}x</strong> de <strong>{fmt(per)}</strong>
                </span>
              )
            })()}
          </div>
        )}

        {!editingId && isScheduled && (
          <div className="field">
            <label className="label">Data prevista</label>
            <input className="input" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </div>
        )}

        {/* More options */}
        <div className="collapsible">
          <button type="button" className="collapsible-head" onClick={() => setMoreOpen((s) => !s)}>
            <Icon name={moreOpen ? "expand_less" : "expand_more"} className="text-[14px]" /> Mais opções
          </button>
          {moreOpen && (
            <div className="collapsible-body">
              <div className="field">
                <label className="label">Observações</label>
                <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="check-row" onClick={() => setIsBill((s) => !s)}>
                <div className={`cb ${isBill ? "checked" : ""}`}>{isBill && <Icon name="check" className="text-[12px]" />}</div>
                <div>
                  <div className="cb-label">Aparece nos vencimentos</div>
                  <div className="cb-help">Mostra na tela de Vencimentos para controle de pagamento</div>
                </div>
              </div>
              {editingId && existing?.classification === "installment" && (
                <div className="check-row" style={{ marginTop: 8 }} onClick={() => setEditCascade((s) => !s)}>
                  <div className={`cb ${editCascade ? "checked" : ""}`}>{editCascade && <Icon name="check" className="text-[12px]" />}</div>
                  <div>
                    <div className="cb-label">Aplicar a todas as parcelas</div>
                    <div className="cb-help">Altera valor, descrição e categoria em todas</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {editingId ? "Salvar" : "Criar transação"}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
