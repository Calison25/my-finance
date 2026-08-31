import { create } from "zustand"
import type { Bank, Card, Transaction, TransactionSummary, Category, CardType, TransactionType } from "@/types"
import { api } from "@/services/api"
import { classifyTransaction } from "@/lib/transaction-format"

interface FinanceState {
  banks: Bank[]
  cards: Card[]
  transactions: Transaction[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  loadedMonths: Set<string>
  valuesVisible: boolean
  toggleValuesVisible: () => void
  fetchAll: () => Promise<void>
  fetchMeta: () => Promise<void>
  ensureMonths: (months: string[]) => Promise<void>
  addBank: (data: { name: string; color: string }) => void
  deleteBank: (id: string) => void
  addCard: (data: { bank_id?: string; custom_bank_name?: string; name: string; type: CardType; last_digits?: string; credit_limit?: number; billing_day?: number; due_day?: number }) => void
  updateCard: (id: string, data: Record<string, unknown>) => void
  deleteCard: (id: string) => void
  addCategory: (name: string) => string
  addTransaction: (data: { card_id: string; description: string; amount: number; type: TransactionType; category_id?: string; custom_category_name?: string; date: string; transaction_date?: string; is_scheduled?: boolean; scheduled_date?: string; is_recurring?: boolean; notes?: string; installments?: number; is_bill?: boolean }) => Promise<void>
  updateTransaction: (id: string, data: { description?: string; amount?: number; type?: TransactionType; category_id?: string | null; custom_category_name?: string; date?: string; notes?: string | null; is_recurring?: boolean; is_bill?: boolean; transaction_date?: string | null }, cascade?: boolean) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  deleteTransactionGroup: (id: string, scope: "all" | "future") => Promise<void>
  realizeTransaction: (id: string) => Promise<void>
  unrealizeTransaction: (id: string) => Promise<void>
  getCardBalance: (cardId: string) => number
  getCardExpenses: (cardId: string) => number
  getCardExpensesByMonth: (cardId: string, month: string) => number
  getCardBalanceByMonth: (cardId: string, month: string) => number
  transactionSummary: TransactionSummary | null
  fetchTransactionSummary: (month: string, cardId?: string) => Promise<void>
  expenseGoal: number | null
  fetchExpenseGoal: () => Promise<void>
  setExpenseGoal: (amount: number) => Promise<void>
  reset: () => void
}

function monthsToRange(months: string[]): { from: string; to: string } {
  const sorted = [...months].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const [ly, lm] = last.split("-").map(Number)
  const lastDay = new Date(ly, lm, 0).getDate()
  return { from: `${first}-01`, to: `${last}-${String(lastDay).padStart(2, "0")}` }
}

function monthsCoveredBy(from: string, to: string): string[] {
  const [fy, fm] = from.slice(0, 7).split("-").map(Number)
  const [ty, tm] = to.slice(0, 7).split("-").map(Number)
  const months: string[] = []
  let y = fy
  let m = fm
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`)
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return months
}

async function refreshLoadedTransactions(
  loadedMonths: Set<string>,
): Promise<Transaction[] | null> {
  if (loadedMonths.size === 0) return null
  const { from, to } = monthsToRange([...loadedMonths])
  return api.transactions.list({ date_from: from, date_to: to })
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  banks: [],
  cards: [],
  transactions: [],
  categories: [],
  isLoading: true,
  error: null,
  loadedMonths: new Set<string>(),
  valuesVisible: localStorage.getItem("values-visible") !== "false",
  toggleValuesVisible: () => set((s) => {
    const next = !s.valuesVisible
    localStorage.setItem("values-visible", String(next))
    return { valuesVisible: next }
  }),

  fetchAll: async () => {
    const isInitial = get().banks.length === 0 && get().cards.length === 0
    if (isInitial) set({ isLoading: true })
    set({ error: null })
    try {
      const now = new Date()
      const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      const nxt = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const nextMonth = `${nxt.getFullYear()}-${String(nxt.getMonth() + 1).padStart(2, "0")}`
      const { from, to } = monthsToRange([cur, nextMonth])
      const [banks, cards, transactions, categories] = await Promise.all([
        api.banks.list(),
        api.cards.list(),
        api.transactions.list({ date_from: from, date_to: to }),
        api.categories.list(),
      ])
      set({
        banks,
        cards,
        transactions,
        categories,
        loadedMonths: new Set([cur, nextMonth]),
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Não foi possível carregar seus dados" })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMeta: async () => {
    const [banks, cards, categories] = await Promise.all([
      api.banks.list(),
      api.cards.list(),
      api.categories.list(),
    ])
    set({ banks, cards, categories })
  },

  ensureMonths: async (months) => {
    const loaded = get().loadedMonths
    const missing = Array.from(new Set(months.filter((m) => !loaded.has(m))))
    if (missing.length === 0) return
    const { from, to } = monthsToRange(missing)
    const fetched = await api.transactions.list({ date_from: from, date_to: to })
    set((s) => {
      // The API call above returns every transaction in the contiguous [from, to]
      // range, which can include months already loaded (when `missing` has gaps).
      // Drop and replace the *entire* covered range, not just `missing`, or those
      // in-between months end up duplicated (kept copy + freshly fetched copy).
      const covered = monthsCoveredBy(from, to)
      const coveredSet = new Set(covered)
      const kept = s.transactions.filter((t) => !coveredSet.has(t.date.slice(0, 7)))
      const next = new Set(s.loadedMonths)
      for (const m of covered) next.add(m)
      return { transactions: [...kept, ...fetched], loadedMonths: next }
    })
  },

  addBank: async (data) => {
    await api.banks.create(data)
    get().fetchMeta()
  },

  deleteBank: async (id) => {
    await api.banks.delete(id)
    get().fetchMeta()
  },

  addCard: async (data) => {
    const body: {
      name: string
      type: CardType
      bank_id?: string
      custom_bank_name?: string
      last_digits?: string
      credit_limit?: number
      billing_day?: number
      due_day?: number
    } = { name: data.name, type: data.type }
    if (data.bank_id) body.bank_id = data.bank_id
    if (data.custom_bank_name) body.custom_bank_name = data.custom_bank_name
    if (data.last_digits) body.last_digits = data.last_digits
    if (data.credit_limit) body.credit_limit = data.credit_limit
    if (data.billing_day) body.billing_day = data.billing_day
    if (data.due_day) body.due_day = data.due_day
    await api.cards.create(body)
    get().fetchMeta()
  },

  updateCard: async (id, data) => {
    await api.cards.update(id, data)
    get().fetchMeta()
  },

  deleteCard: async (id) => {
    await api.cards.delete(id)
    get().fetchMeta()
  },

  addCategory: (name) => {
    const tempId = crypto.randomUUID()
    set((s) => ({
      categories: [
        ...s.categories,
        { id: tempId, name, icon: null, color: "#6B7280", is_default: false, user_id: null, household_id: null },
      ],
    }))
    api.categories.create({ name, color: "#6B7280" }).then(() => get().fetchMeta())
    return tempId
  },

  addTransaction: async (data) => {
    await api.transactions.create({
      card_id: data.card_id,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id || undefined,
      custom_category_name: data.custom_category_name || undefined,
      date: data.date,
      transaction_date: data.transaction_date || undefined,
      is_scheduled: data.is_scheduled || false,
      scheduled_date: data.scheduled_date || undefined,
      is_recurring: data.is_recurring || false,
      notes: data.notes || undefined,
      installments: data.installments || undefined,
      is_bill: data.is_bill || false,
    })
    const fresh = await refreshLoadedTransactions(get().loadedMonths)
    if (fresh) set({ transactions: fresh })
  },

  updateTransaction: async (id, data) => {
    await api.transactions.update(id, data as Record<string, unknown>)
    const fresh = await refreshLoadedTransactions(get().loadedMonths)
    if (fresh) set({ transactions: fresh })
  },

  deleteTransaction: async (id) => {
    await api.transactions.delete(id)
    const fresh = await refreshLoadedTransactions(get().loadedMonths)
    if (fresh) set({ transactions: fresh })
  },

  deleteTransactionGroup: async (id, scope) => {
    await api.transactions.deleteGroup(id, scope)
    const fresh = await refreshLoadedTransactions(get().loadedMonths)
    if (fresh) set({ transactions: fresh })
  },

  realizeTransaction: async (id) => {
    const updated = await api.transactions.realize(id)
    set((s) => ({
      // O endpoint de update não devolve `classification`; recompõe localmente
      // para a transação não sumir dos filtros/cards até o próximo refetch.
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...updated, classification: classifyTransaction({ ...t, ...updated }) } : t,
      ),
    }))
  },

  unrealizeTransaction: async (id) => {
    const updated = await api.transactions.update(id, { is_realized: false } as Record<string, unknown>)
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...updated, classification: classifyTransaction({ ...t, ...updated }) } : t,
      ),
    }))
  },

  getCardBalance: (cardId) => {
    return get()
      .transactions.filter((t) => t.card_id === cardId)
      .reduce((acc, t) => (t.type === "INCOME" ? acc + t.amount : acc - t.amount), 0)
  },

  getCardExpenses: (cardId) => {
    const now = new Date()
    const refMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthStart = new Date(refMonth.getFullYear(), refMonth.getMonth(), 1)
      .toISOString()
      .slice(0, 10)
    return get()
      .transactions.filter(
        (t) => t.card_id === cardId && t.type === "EXPENSE" && t.date >= monthStart,
      )
      .reduce((acc, t) => acc + t.amount, 0)
  },

  getCardBalanceByMonth: (cardId, month) => {
    const [year, m] = month.split("-").map(Number)
    const monthStart = new Date(year, m - 1, 1).toISOString().slice(0, 10)
    const monthEnd = new Date(year, m, 0).toISOString().slice(0, 10)
    return get()
      .transactions.filter(
        (t) => t.card_id === cardId && t.date >= monthStart && t.date <= monthEnd,
      )
      .reduce((acc, t) => (t.type === "INCOME" ? acc + t.amount : acc - t.amount), 0)
  },

  getCardExpensesByMonth: (cardId, month) => {
    const [year, m] = month.split("-").map(Number)
    const monthStart = new Date(year, m - 1, 1).toISOString().slice(0, 10)
    const monthEnd = new Date(year, m, 0).toISOString().slice(0, 10)
    return get()
      .transactions.filter(
        (t) => t.card_id === cardId && t.type === "EXPENSE" && t.date >= monthStart && t.date <= monthEnd,
      )
      .reduce((acc, t) => acc + t.amount, 0)
  },

  reset: () => set({
    banks: [],
    cards: [],
    transactions: [],
    categories: [],
    transactionSummary: null,
    loadedMonths: new Set<string>(),
    isLoading: false,
    error: null,
    expenseGoal: null,
  }),

  expenseGoal: null,
  fetchExpenseGoal: async () => {
    try {
      const raw = await api.expenseGoal.get()
      set({ expenseGoal: raw.amount == null ? null : Number(raw.amount) })
    } catch {
      // silent - goal is optional, dashboard works without it
    }
  },
  setExpenseGoal: async (amount) => {
    const raw = await api.expenseGoal.set(amount)
    set({ expenseGoal: raw.amount == null ? null : Number(raw.amount) })
  },

  transactionSummary: null,
  fetchTransactionSummary: async (month, cardId) => {
    try {
      const raw = await api.transactions.summary(month, cardId)
      const toNum = (v: unknown) => Number(v) || 0
      const fixBalance = (b: typeof raw.realized) => ({
        income: toNum(b.income),
        expenses: toNum(b.expenses),
        balance: toNum(b.balance),
      })
      const fixGroup = (g: typeof raw.recurring) => ({
        income_total: toNum(g.income_total),
        expense_total: toNum(g.expense_total),
        total: toNum(g.total),
        count: g.count,
      })
      const fs = raw.financial_summary
      set({
        transactionSummary: {
          total_month: toNum(raw.total_month),
          realized: fixBalance(raw.realized),
          pending: fixBalance(raw.pending),
          recurring: fixGroup(raw.recurring),
          installments: fixGroup(raw.installments),
          scheduled: fixGroup(raw.scheduled),
          financial_summary: {
            total_income: toNum(fs?.total_income),
            realized_expenses: toNum(fs?.realized_expenses),
            scheduled_expenses: toNum(fs?.scheduled_expenses),
            total_expenses: toNum(fs?.total_expenses),
            current_balance: toNum(fs?.current_balance),
            projected_balance: toNum(fs?.projected_balance),
          },
        },
      })
    } catch {
      // silent - summary is optional, page works with fallback zeros
    }
  },
}))
