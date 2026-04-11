import { create } from "zustand"
import type { Bank, Card, Transaction, Category, CardType, TransactionType } from "@/types"
import { api } from "@/services/api"

interface FinanceState {
  banks: Bank[]
  cards: Card[]
  transactions: Transaction[]
  categories: Category[]
  isLoading: boolean
  valuesVisible: boolean
  toggleValuesVisible: () => void
  fetchAll: () => Promise<void>
  addBank: (data: { name: string; color: string }) => void
  deleteBank: (id: string) => void
  addCard: (data: { bank_id?: string; custom_bank_name?: string; name: string; type: CardType; last_digits?: string; credit_limit?: number; billing_day?: number; due_day?: number }) => void
  updateCard: (id: string, data: Record<string, unknown>) => void
  deleteCard: (id: string) => void
  addCategory: (name: string) => string
  addTransaction: (data: { card_id: string; description: string; amount: number; type: TransactionType; category_id?: string; custom_category_name?: string; date: string; is_scheduled?: boolean; scheduled_date?: string; is_recurring?: boolean; notes?: string; installments?: number; is_bill?: boolean }) => void
  updateTransaction: (id: string, data: { description?: string; amount?: number; type?: TransactionType; category_id?: string | null; notes?: string | null; is_recurring?: boolean }, cascade?: boolean) => void
  deleteTransaction: (id: string) => void
  deleteRecurringFuture: (id: string) => void
  realizeTransaction: (id: string) => void
  unrealizeTransaction: (id: string) => void
  getCardBalance: (cardId: string) => number
  getCardExpenses: (cardId: string) => number
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  banks: [],
  cards: [],
  transactions: [],
  categories: [],
  isLoading: true,
  valuesVisible: localStorage.getItem("values-visible") !== "false",
  toggleValuesVisible: () => set((s) => {
    const next = !s.valuesVisible
    localStorage.setItem("values-visible", String(next))
    return { valuesVisible: next }
  }),

  fetchAll: async () => {
    set({ isLoading: true })
    const [banks, cards, transactions, categories] = await Promise.all([
      api.banks.list(),
      api.cards.list(),
      api.transactions.list(),
      api.categories.list(),
    ])
    set({ banks, cards, transactions, categories, isLoading: false })
  },

  addBank: async (data) => {
    await api.banks.create({ name: data.name, color: data.color })
    get().fetchAll()
  },

  deleteBank: async (id) => {
    await api.banks.delete(id)
    get().fetchAll()
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
    get().fetchAll()
  },

  updateCard: async (id, data) => {
    await api.cards.update(id, data)
    get().fetchAll()
  },

  deleteCard: async (id) => {
    await api.cards.delete(id)
    get().fetchAll()
  },

  addCategory: (name) => {
    const tempId = crypto.randomUUID()
    set((s) => ({
      categories: [
        ...s.categories,
        { id: tempId, name, icon: null, color: "#6B7280", is_default: false, user_id: null },
      ],
    }))
    api.categories.create({ name, color: "#6B7280" }).then(() => get().fetchAll())
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
      is_scheduled: data.is_scheduled || false,
      scheduled_date: data.scheduled_date || undefined,
      is_recurring: data.is_recurring || false,
      notes: data.notes || undefined,
      installments: data.installments || undefined,
      is_bill: data.is_bill || false,
    })
    get().fetchAll()
  },

  updateTransaction: async (id, data) => {
    await api.transactions.update(id, data as Record<string, unknown>)
    get().fetchAll()
  },

  deleteTransaction: async (id) => {
    await api.transactions.delete(id)
    get().fetchAll()
  },

  deleteRecurringFuture: async (id) => {
    await api.transactions.deleteRecurringFuture(id)
    get().fetchAll()
  },

  realizeTransaction: async (id) => {
    await api.transactions.realize(id)
    await get().fetchAll()
  },

  unrealizeTransaction: async (id) => {
    await api.transactions.update(id, { is_realized: false } as Record<string, unknown>)
    await get().fetchAll()
  },

  getCardBalance: (cardId) => {
    return get()
      .transactions.filter((t) => t.card_id === cardId)
      .reduce((acc, t) => (t.type === "INCOME" ? acc + t.amount : acc - t.amount), 0)
  },

  getCardExpenses: (cardId) => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10)
    return get()
      .transactions.filter(
        (t) => t.card_id === cardId && t.type === "EXPENSE" && t.date >= monthStart,
      )
      .reduce((acc, t) => acc + t.amount, 0)
  },
}))
