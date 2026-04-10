import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Bank, Card, Transaction, Category, CardType, TransactionType } from "@/types"

const DEFAULT_BANKS: Bank[] = [
  { id: "b1", name: "Nubank", code: "260", logo_url: "/bank-logos/nubank.svg", color: "#820AD1", is_default: true, user_id: null },
  { id: "b2", name: "Bradesco", code: "237", logo_url: "/bank-logos/bradesco.svg", color: "#CC092F", is_default: true, user_id: null },
  { id: "b3", name: "Itau", code: "341", logo_url: "/bank-logos/itau.svg", color: "#003399", is_default: true, user_id: null },
  { id: "b4", name: "Banco do Brasil", code: "001", logo_url: "/bank-logos/bb.svg", color: "#003882", is_default: true, user_id: null },
  { id: "b5", name: "Caixa", code: "104", logo_url: "/bank-logos/caixa.svg", color: "#005CA9", is_default: true, user_id: null },
  { id: "b6", name: "Santander", code: "033", logo_url: "/bank-logos/santander.svg", color: "#EC0000", is_default: true, user_id: null },
  { id: "b7", name: "Inter", code: "077", logo_url: "/bank-logos/inter.svg", color: "#FF7A00", is_default: true, user_id: null },
  { id: "b8", name: "C6 Bank", code: "336", logo_url: "/bank-logos/c6.svg", color: "#242424", is_default: true, user_id: null },
  { id: "b9", name: "BTG Pactual", code: "208", logo_url: "/bank-logos/btg.svg", color: "#001E3D", is_default: true, user_id: null },
  { id: "b10", name: "Next", code: "237", logo_url: "/bank-logos/next.svg", color: "#00E364", is_default: true, user_id: null },
  { id: "b11", name: "PicPay", code: "380", logo_url: "/bank-logos/picpay.svg", color: "#21C25E", is_default: true, user_id: null },
  { id: "b12", name: "Sicoob", code: "756", logo_url: "/bank-logos/sicoob.svg", color: "#003641", is_default: true, user_id: null },
  { id: "b13", name: "Sicredi", code: "748", logo_url: "/bank-logos/sicredi.svg", color: "#00A651", is_default: true, user_id: null },
  { id: "b14", name: "Mercado Pago", code: "323", logo_url: "/bank-logos/mp.svg", color: "#009EE3", is_default: true, user_id: null },
  { id: "b15", name: "PagBank", code: "290", logo_url: "/bank-logos/pagbank.svg", color: "#FFC700", is_default: true, user_id: null },
]

const DEFAULT_CATEGORIES: Category[] = [
  { id: "c1", name: "Alimentacao", icon: "🍽️", color: "#FF6B6B", is_default: true, user_id: null },
  { id: "c2", name: "Transporte", icon: "🚗", color: "#4ECDC4", is_default: true, user_id: null },
  { id: "c3", name: "Moradia", icon: "🏠", color: "#45B7D1", is_default: true, user_id: null },
  { id: "c4", name: "Saude", icon: "💊", color: "#96CEB4", is_default: true, user_id: null },
  { id: "c5", name: "Educacao", icon: "📚", color: "#FFEAA7", is_default: true, user_id: null },
  { id: "c6", name: "Lazer", icon: "🎮", color: "#DDA0DD", is_default: true, user_id: null },
  { id: "c7", name: "Compras", icon: "🛒", color: "#98D8C8", is_default: true, user_id: null },
  { id: "c8", name: "Servicos", icon: "⚙️", color: "#F7DC6F", is_default: true, user_id: null },
  { id: "c9", name: "Salario", icon: "💰", color: "#82E0AA", is_default: true, user_id: null },
  { id: "c10", name: "Outros", icon: "📌", color: "#AEB6BF", is_default: true, user_id: null },
]

function uid() {
  return crypto.randomUUID()
}

interface FinanceState {
  banks: Bank[]
  cards: Card[]
  transactions: Transaction[]
  categories: Category[]
  addBank: (data: { name: string; color: string }) => void
  deleteBank: (id: string) => void
  addCard: (data: { bank_id: string; name: string; type: CardType; last_digits?: string; credit_limit?: number; billing_day?: number }) => void
  deleteCard: (id: string) => void
  addTransaction: (data: { card_id: string; description: string; amount: number; type: TransactionType; category_id?: string; date: string; is_scheduled?: boolean; scheduled_date?: string; notes?: string }) => void
  deleteTransaction: (id: string) => void
  realizeTransaction: (id: string) => void
  getCardBalance: (cardId: string) => number
  getCardExpenses: (cardId: string) => number
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      banks: DEFAULT_BANKS,
      cards: [],
      transactions: [],
      categories: DEFAULT_CATEGORIES,

      addBank: (data) =>
        set((s) => ({
          banks: [...s.banks, { id: uid(), ...data, code: null, logo_url: null, is_default: false, user_id: "local" }],
        })),

      deleteBank: (id) =>
        set((s) => ({
          banks: s.banks.filter((b) => b.id !== id || b.is_default),
        })),

      addCard: (data) =>
        set((s) => ({
          cards: [
            ...s.cards,
            {
              id: uid(),
              user_id: "local",
              bank_id: data.bank_id,
              name: data.name,
              type: data.type,
              last_digits: data.last_digits ?? null,
              credit_limit: data.credit_limit ?? null,
              billing_day: data.billing_day ?? null,
              created_at: new Date().toISOString(),
            },
          ],
        })),

      deleteCard: (id) =>
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== id),
          transactions: s.transactions.filter((t) => t.card_id !== id),
        })),

      addTransaction: (data) =>
        set((s) => ({
          transactions: [
            ...s.transactions,
            {
              id: uid(),
              card_id: data.card_id,
              description: data.description,
              amount: data.amount,
              type: data.type,
              category_id: data.category_id ?? null,
              date: data.date,
              is_scheduled: data.is_scheduled ?? false,
              scheduled_date: data.scheduled_date ?? null,
              is_realized: false,
              notes: data.notes ?? null,
              created_at: new Date().toISOString(),
            },
          ],
        })),

      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      realizeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, is_realized: true, is_scheduled: false } : t
          ),
        })),

      getCardBalance: (cardId) => {
        const txs = get().transactions.filter((t) => t.card_id === cardId)
        return txs.reduce((acc, t) => {
          if (t.type === "INCOME") return acc + t.amount
          return acc - t.amount
        }, 0)
      },

      getCardExpenses: (cardId) => {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        return get()
          .transactions.filter(
            (t) => t.card_id === cardId && t.type === "EXPENSE" && t.date >= monthStart
          )
          .reduce((acc, t) => acc + t.amount, 0)
      },
    }),
    { name: "my-finance-data" }
  )
)
