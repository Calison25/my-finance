import type { Bank, Card, Transaction, TransactionSummary, Category, Member, HouseholdInvite } from "@/types"
import { supabase } from "@/lib/supabase"

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    if (res.status === 422) {
      const body = await res.json().catch(() => ({ detail: "" }))
      throw new Error(body.detail || "Dados inválidos")
    }
    const statusMessages: Record<number, string> = {
      400: "Requisição inválida",
      403: "Acesso negado",
      404: "Recurso não encontrado",
      500: "Erro interno do servidor",
    }
    throw new Error(statusMessages[res.status] || `Erro ${res.status}`)
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
    is_bill: raw.is_bill === true,
    credit_limit: raw.credit_limit != null ? toNumber(raw.credit_limit) : undefined,
  } as Transaction
}

function normalizeCard(raw: Record<string, unknown>): Card {
  return {
    ...(raw as unknown as Card),
    credit_limit: raw.credit_limit != null ? toNumber(raw.credit_limit) : null,
    due_day: raw.due_day != null ? toNumber(raw.due_day) : null,
  }
}

export const api = {
  banks: {
    list: () => request<Bank[]>("/api/banks"),
    create: (data: { name: string; color: string }) =>
      request<Bank>("/api/banks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/banks/${id}`, { method: "DELETE" }),
  },

  cards: {
    list: async () => {
      const raw = await request<Record<string, unknown>[]>("/api/cards")
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
      due_day?: number
    }) =>
      request<Card>("/api/cards", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/api/cards/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(normalizeCard),
    delete: (id: string) =>
      request<void>(`/api/cards/${id}`, { method: "DELETE" }),
  },

  transactions: {
    list: async () => {
      const raw = await request<Record<string, unknown>[]>("/api/transactions")
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
      transaction_date?: string
      is_scheduled?: boolean
      scheduled_date?: string
      is_recurring?: boolean
      notes?: string
      installments?: number
      is_bill?: boolean
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
    deleteGroup: (id: string, scope: "all" | "future") =>
      request<void>(`/api/transactions/${id}/group?scope=${scope}`, {
        method: "DELETE",
      }),
    summary: (month: string, cardId?: string) => {
      const params = new URLSearchParams({ month })
      if (cardId) params.set("card_id", cardId)
      return request<TransactionSummary>(`/api/transactions/summary?${params}`)
    },
  },

  categories: {
    list: () => request<Category[]>("/api/categories"),
    create: (data: { name: string; color: string }) =>
      request<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/categories/${id}`, { method: "DELETE" }),
  },

  household: {
    listMembers: () => request<Member[]>("/api/households/members"),
    invite: (email: string) =>
      request<HouseholdInvite>("/api/households/invites", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    listInvites: () =>
      request<HouseholdInvite[]>("/api/households/invites"),
    cancelInvite: (id: string) =>
      request<void>(`/api/households/invites/${id}`, { method: "DELETE" }),
    removeMember: (userId: string) =>
      request<void>(`/api/households/members/${userId}`, { method: "DELETE" }),
  },
}
