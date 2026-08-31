import type { Category } from "@/types"

export const CATEGORY_ICONS: Record<string, string> = {
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

export function categoryIconFor(cat: Category | null): string {
  if (!cat) return "receipt_long"
  return CATEGORY_ICONS[cat.name] ?? cat.icon ?? "receipt_long"
}

export function formatCentsToBRL(cents: number): string {
  if (cents === 0) return ""
  const reais = Math.floor(cents / 100)
  const cv = cents % 100
  return `${reais.toLocaleString("pt-BR")},${String(cv).padStart(2, "0")}`
}

export function parseBRLToNumber(s: string): number {
  const d = s.replace(/\D/g, "")
  return d ? parseInt(d, 10) / 100 : 0
}

export function defaultCompetenceMonth(): string {
  const next = new Date()
  next.setMonth(next.getMonth() + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
}

export function competenceDateFor(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number)
  const today = new Date()
  const lastDay = new Date(y, m, 0).getDate()
  const day = Math.min(today.getDate(), lastDay)
  return `${monthStr}-${String(day).padStart(2, "0")}`
}

export function competenceLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export function shiftCompetence(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function baseDescription(d: string): string {
  return d.replace(/\s\(\d+\/\d+\)$/, "")
}

// Data usada para ordenar/agrupar listagens: a data real do evento.
// Fallback para a competência cobre dados anteriores à migração 017.
export function realDateOf(t: { date: string; transaction_date: string | null }): string {
  return t.transaction_date ?? t.date
}

// Espelho de classify_transaction do backend — usado para recompor a
// classificação após updates pontuais (a resposta do update vem sem ela).
export function classifyTransaction(t: {
  is_scheduled: boolean
  is_realized: boolean
  is_recurring: boolean
  installment_group_id?: string | null
  description: string
}): string {
  if (t.is_scheduled && !t.is_realized) return "scheduled"
  if (t.is_recurring) return "recurring"
  if (t.installment_group_id || /\(\d+\/\d+\)$/.test(t.description)) return "installment"
  return "regular"
}
