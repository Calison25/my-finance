import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import { toast } from "@/components/ui/Toast"
import { TransactionWizard } from "@/components/transactions/TransactionWizard"
import {
  categoryIconFor,
  formatCentsToBRL,
  parseBRLToNumber,
  defaultCompetenceMonth,
  competenceLabel,
  baseDescription,
  realDateOf,
} from "@/lib/transaction-format"
import type { TransactionType } from "@/types"

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

type SrcKind = "all" | "account" | "card"

export function Transactions() {
  const {
    transactions,
    cards,
    categories,
    banks,
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

  const filterType = (searchParams.get("type") as "ALL" | "EXPENSE" | "INCOME" | null) ?? "ALL"
  const setFilterType = (t: "ALL" | "EXPENSE" | "INCOME") => updateParams({ type: t === "ALL" ? null : t })

  type ClassificationFilter = "all" | "recurring" | "installment" | "scheduled" | "realized"
  const filterClassification = (searchParams.get("classification") as ClassificationFilter | null) ?? "all"
  const setFilterClassification = (c: ClassificationFilter) => updateParams({ classification: c === "all" ? null : c })

  const [srcKind, setSrcKind] = useState<SrcKind>("all")
  const [filterCategoryIds, setFilterCategoryIds] = useState<Set<string>>(new Set())
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

  // Modal state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalKey, setModalKey] = useState(0) // remount on each open
  const [deletePrompt, setDeletePrompt] = useState<{ id: string; kind: "recurring" | "installment" | "regular" } | null>(null)

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
    return categoryIconFor(categoryOf(catId))
  }

  const baseFiltered = useMemo(() => {
    const needle = searchText.trim().toLowerCase()
    return transactions
      .filter((t) => t.date.startsWith(selectedMonth))
      .filter((t) => filterType === "ALL" || t.type === filterType)
      .filter((t) => {
        if (filterClassification === "all") return true
        if (filterClassification === "realized") return t.classification !== "scheduled"
        return t.classification === filterClassification
      })
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
  }, [transactions, selectedMonth, filterType, filterClassification, srcKind, filterCardId, filterCategoryIds, searchText, cards])

  const sorted = useMemo(
    () => [...baseFiltered].sort((a, b) => realDateOf(b).localeCompare(realDateOf(a))),
    [baseFiltered],
  )

  const summary = useMemo(() => {
    const src = baseFiltered
    const isFuture = (t: typeof src[number]) => t.classification === "scheduled"
    const signedSum = (arr: typeof src) =>
      arr.reduce((s, t) => s + (t.type === "INCOME" ? Number(t.amount) : -Number(t.amount)), 0)
    const expenseSum = (arr: typeof src) =>
      arr.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0)

    return {
      totalDespesa: expenseSum(src.filter((t) => !isFuture(t))),
      futuro: signedSum(src.filter((t) => isFuture(t))),
    }
  }, [baseFiltered])

  const grouped = useMemo(() => {
    const acc: Record<string, typeof sorted> = {}
    for (const tx of sorted) {
      const key = realDateOf(tx)
      if (!acc[key]) acc[key] = []
      acc[key].push(tx)
    }
    return acc
  }, [sorted])

  const activeFilterCount =
    (filterType !== "ALL" ? 1 : 0) +
    (filterClassification !== "all" ? 1 : 0) +
    (srcKind !== "all" ? 1 : 0) +
    (filterCardId ? 1 : 0) +
    filterCategoryIds.size

  const classificationLabel: Record<ClassificationFilter, string> = {
    all: "",
    recurring: "Recorrentes",
    installment: "Parcelados",
    scheduled: "Agendados",
    realized: "Realizado",
  }

  function clearAllFilters() {
    setFilterType("ALL")
    setFilterClassification("all")
    setSrcKind("all")
    setFilterCardId("")
    setFilterCategoryIds(new Set())
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
    setModalKey((k) => k + 1)
    setWizardOpen(true)
  }
  function openEdit(id: string) {
    setModalKey((k) => k + 1)
    setEditingId(id)
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
                        <Icon name={categoryIconFor(c)} className="text-[14px]" />
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
          {filterClassification !== "all" && (
            <span className="filter-token">
              {classificationLabel[filterClassification]}
              <button onClick={() => setFilterClassification("all")}><Icon name="close" className="text-[12px]" /></button>
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
        <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div
            className={`kpi ${filterClassification === "realized" && filterType === "EXPENSE" ? "kpi-active" : ""}`}
            role="button"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const active = filterClassification === "realized" && filterType === "EXPENSE"
              setFilterClassification(active ? "all" : "realized")
              setFilterType(active ? "ALL" : "EXPENSE")
            }}
          >
            <div className="kpi-label"><Icon name="payments" className="text-[12px]" />Total Despesa</div>
            <div className="kpi-value negative">
              <MoneyValue value={summary.totalDespesa} />
            </div>
            <div className="kpi-meta">Despesas já concluídas no mês</div>
          </div>
          <div
            className={`kpi ${filterClassification === "scheduled" ? "kpi-active" : ""}`}
            role="button"
            style={{ cursor: "pointer" }}
            onClick={() => setFilterClassification(filterClassification === "scheduled" ? "all" : "scheduled")}
          >
            <div className="kpi-label"><Icon name="schedule" className="text-[12px]" />Futuro</div>
            <div className={`kpi-value ${summary.futuro >= 0 ? "positive" : "negative"}`}>
              <MoneyValue value={summary.futuro} />
            </div>
            <div className="kpi-meta">Agendadas para o mês</div>
          </div>
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
            const dayIncome = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0)
            const dayExpense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0)
            const net = dayIncome - dayExpense
            return (
              <div key={date} className="day-group">
                <div className="day-header">
                  <div className="day-date">
                    {formatDayHeader(date)}
                  </div>
                  <div className="day-meta">
                    <span>{txs.length} lanç.</span>
                    <span className="num" style={{ color: net >= 0 ? "var(--positive)" : "var(--negative)" }}>
                      {net >= 0 ? "+" : "-"}<MoneyValue value={Math.abs(net)} />
                    </span>
                  </div>
                </div>
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
                                if (tx.is_recurring || tx.classification === "recurring") setDeletePrompt({ id: tx.id, kind: "recurring" })
                                else if (tx.classification === "installment") setDeletePrompt({ id: tx.id, kind: "installment" })
                                else setDeletePrompt({ id: tx.id, kind: "regular" })
                              }}
                            >
                              <Icon name="delete" className="text-[13px]" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
              </div>
            )
          })}
        </div>
      )}

      {wizardOpen && (
        <TransactionWizard
          key={modalKey}
          defaultMonth={selectedMonth}
          onClose={() => setWizardOpen(false)}
          onCreated={() => setWizardOpen(false)}
        />
      )}

      {editingId && (
        <TransactionEditModal
          key={modalKey}
          transactionId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => setEditingId(null)}
        />
      )}

      <Dialog
        open={deletePrompt !== null}
        onClose={() => setDeletePrompt(null)}
        title={
          deletePrompt?.kind === "recurring"
            ? "Excluir recorrente"
            : deletePrompt?.kind === "installment"
              ? "Excluir parcelamento"
              : "Excluir transação"
        }
      >
        {deletePrompt?.kind === "regular" ? (
          <>
            <p style={{ marginBottom: 16 }}>Tem certeza que deseja excluir esta transação?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-danger" onClick={async () => {
                if (!deletePrompt) return
                const p = deletePrompt
                setDeletePrompt(null)
                await toast.run("Excluindo...", () => deleteTransaction(p.id), "Transação excluída")
              }}>Excluir</button>
              <button className="btn btn-ghost" onClick={() => setDeletePrompt(null)}>Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 16 }}>
              {deletePrompt?.kind === "recurring"
                ? "Deseja excluir apenas esta, desta em diante, ou todas as recorrências?"
                : "Deseja excluir apenas esta, desta em diante, ou todas as parcelas?"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-secondary" onClick={async () => {
                if (!deletePrompt) return
                const p = deletePrompt
                setDeletePrompt(null)
                await toast.run("Excluindo...", () => deleteTransaction(p.id), "Transação excluída")
              }}>Apenas esta</button>
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
          </>
        )}
      </Dialog>
    </div>
  )
}

interface TxEditModalProps {
  transactionId: string
  onClose: () => void
  onSaved: () => void
}

function TransactionEditModal({ transactionId, onClose, onSaved }: TxEditModalProps) {
  const { transactions, categories, updateTransaction } = useFinanceStore()
  const existing = transactions.find((t) => t.id === transactionId) ?? null

  const installmentSuffix = existing?.description.match(/\s*\(\d+\/\d+\)$/)?.[0] ?? ""

  const [type, setType] = useState<TransactionType>(existing?.type ?? "EXPENSE")
  const [amount, setAmount] = useState(existing ? formatCentsToBRL(Math.round(existing.amount * 100)) : "")
  const [description, setDescription] = useState(existing ? baseDescription(existing.description) : "")
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "")
  const [customCategoryName, setCustomCategoryName] = useState("")
  const [competence, setCompetence] = useState(existing ? existing.date.slice(0, 7) : defaultCompetenceMonth())
  const [transactionDate, setTransactionDate] = useState(existing?.transaction_date ?? "")
  const isRecurring = existing?.is_recurring ?? false
  const [isBill, setIsBill] = useState(existing?.is_bill ?? false)
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [editCascade, setEditCascade] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isOtherCategory = categoryId === "__other__"
  const competenceLabelText = competenceLabel(competence)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const amountNum = parseBRLToNumber(amount)
    if (!amountNum || !description || !categoryId || (isOtherCategory && !customCategoryName)) {
      toast.error("Preencha os campos obrigatórios")
      return
    }
    setSubmitting(true)
    try {
      await toast.run("Salvando...", () => updateTransaction(transactionId, {
        description: description + installmentSuffix,
        amount: amountNum,
        type,
        category_id: isOtherCategory ? null : (categoryId || null),
        custom_category_name: isOtherCategory ? customCategoryName : undefined,
        notes: notes || null,
        is_recurring: isRecurring,
        transaction_date: transactionDate || null,
      }, editCascade), "Transação atualizada")
      onSaved()
    } catch {} finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose} title="Editar transação">
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
                <Icon name={categoryIconFor(c)} className="text-[12px]" />
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
          <span className="help">A transação aparecerá em <strong>{competenceLabelText}</strong></span>
        </div>
        <div className="field">
          <label className="label">Data real da transação</label>
          <input
            type="date"
            className="input"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
          <span className="help">Quando o gasto de fato aconteceu. Se vazio, será considerado o dia 1 do mês de competência.</span>
        </div>

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
              {existing?.classification === "installment" && (
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
            Salvar
          </button>
        </div>
      </form>
    </Dialog>
  )
}
