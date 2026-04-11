import type { Bank, Card, Transaction, Category } from "@/types"

const USER_ID = "00000000-0000-0000-0000-000000000001"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API Error ${res.status}: ${body}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return parseFloat(value)
  return 0
}

function normalizeTransaction(raw: Record<string, unknown>): Transaction {
  return {
    ...(raw as unknown as Transaction),
    amount: toNumber(raw.amount),
    credit_limit: raw.credit_limit != null ? toNumber(raw.credit_limit) : undefined,
  } as Transaction
}

function normalizeCard(raw: Record<string, unknown>): Card {
  return {
    ...(raw as unknown as Card),
    credit_limit: raw.credit_limit != null ? toNumber(raw.credit_limit) : null,
  }
}

export const api = {
  banks: {
    list: () => request<Bank[]>("/api/banks"),
    create: (data: { name: string; color: string }) =>
      request<Bank>("/api/banks", {
        method: "POST",
        body: JSON.stringify({ ...data, user_id: USER_ID }),
      }),
    delete: (id: string) =>
      request<void>(`/api/banks/${id}`, { method: "DELETE" }),
  },

  cards: {
    list: async () => {
      const raw = await request<Record<string, unknown>[]>(
        `/api/cards?user_id=${USER_ID}`,
      )
      return raw.map(normalizeCard)
    },
    create: (data: {
      bank_id?: string
      custom_bank_name?: string
      name: string
      type: string
      last_digits?: string
      credit_limit?: number
      billing_day?: number
    }) =>
      request<Card>(`/api/cards?user_id=${USER_ID}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/cards/${id}`, { method: "DELETE" }),
  },

  transactions: {
    list: async () => {
      const raw = await request<Record<string, unknown>[]>(
        `/api/transactions?user_id=${USER_ID}`,
      )
      return raw.map(normalizeTransaction)
    },
    create: (data: {
      card_id: string
      description: string
      amount: number
      type: string
      category_id?: string
      custom_category_name?: string
      date: string
      is_scheduled?: boolean
      scheduled_date?: string
      is_recurring?: boolean
      notes?: string
      installments?: number
    }) =>
      request<Record<string, unknown>[]>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((raw) => raw.map(normalizeTransaction)),
    update: (
      id: string,
      data: Record<string, unknown>,
    ) =>
      request<Record<string, unknown>>(`/api/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(normalizeTransaction),
    realize: (id: string) =>
      request<Record<string, unknown>>(
        `/api/transactions/${id}/realize`,
        { method: "PATCH" },
      ).then(normalizeTransaction),
    delete: (id: string) =>
      request<void>(`/api/transactions/${id}`, { method: "DELETE" }),
    deleteRecurringFuture: (id: string) =>
      request<void>(`/api/transactions/${id}/recurring-future`, {
        method: "DELETE",
      }),
  },

  categories: {
    list: () => request<Category[]>("/api/categories"),
    create: (data: { name: string; color: string }) =>
      request<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ ...data, user_id: USER_ID }),
      }),
    delete: (id: string) =>
      request<void>(`/api/categories/${id}`, { method: "DELETE" }),
  },
}
