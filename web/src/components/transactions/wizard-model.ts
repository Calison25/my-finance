import {
  baseDescription,
  competenceDateFor,
  competenceLabel,
  formatCentsToBRL,
  parseBRLToNumber,
} from "@/lib/transaction-format"
import type { Card, Transaction, TransactionType } from "@/types"

export interface WizardForm {
  type: TransactionType
  amount: string
  description: string
  srcKind: "account" | "card"
  cardId: string
  categoryId: string
  customCategoryName: string
  categorySearch: string
  competence: string
  transactionDate: string
  isInstallment: boolean
  installments: number
  isScheduled: boolean
  scheduledDate: string
  isRecurring: boolean
  notes: string
  isBill: boolean
  editCascade: boolean
}

export const WIZARD_STEPS = [
  { id: "valor", label: "Valor" },
  { id: "pagamento", label: "Pagamento" },
  { id: "categoria", label: "Categoria" },
  { id: "quando", label: "Quando" },
  { id: "opcionais", label: "Opcionais" },
  { id: "revisao", label: "Revisão" },
] as const

function todayISO(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
}

export function emptyWizardForm(defaultMonth: string): WizardForm {
  return {
    type: "EXPENSE",
    amount: "",
    description: "",
    srcKind: "card",
    cardId: "",
    categoryId: "",
    customCategoryName: "",
    categorySearch: "",
    competence: defaultMonth,
    transactionDate: todayISO(),
    isInstallment: false,
    installments: 2,
    isScheduled: false,
    scheduledDate: "",
    isRecurring: false,
    notes: "",
    isBill: false,
    editCascade: false,
  }
}

export function wizardFormFromTransaction(tx: Transaction, cards: Card[]): WizardForm {
  const card = cards.find((c) => c.id === tx.card_id)
  return {
    type: tx.type,
    amount: formatCentsToBRL(Math.round(tx.amount * 100)),
    description: baseDescription(tx.description),
    srcKind: card?.type === "CREDIT_CARD" ? "card" : "account",
    cardId: tx.card_id,
    categoryId: tx.category_id ?? "",
    customCategoryName: "",
    categorySearch: "",
    competence: tx.date.slice(0, 7),
    transactionDate: tx.transaction_date ?? "",
    isInstallment: false,
    installments: 2,
    isScheduled: tx.is_scheduled,
    scheduledDate: tx.scheduled_date ?? "",
    isRecurring: tx.is_recurring,
    notes: tx.notes ?? "",
    isBill: tx.is_bill,
    editCascade: false,
  }
}

export function isOtherCategory(form: WizardForm): boolean {
  return form.categoryId === "__other__"
}

export function missingRequired(form: WizardForm): string[] {
  const missing: string[] = []
  if (parseBRLToNumber(form.amount) <= 0) missing.push("valor")
  if (!form.description.trim()) missing.push("descrição")
  if (!form.cardId) missing.push("origem")
  if (isOtherCategory(form) ? !form.customCategoryName.trim() : !form.categoryId) missing.push("categoria")
  return missing
}

export function isStepValid(form: WizardForm, step: number): boolean {
  switch (step) {
    case 0:
      return parseBRLToNumber(form.amount) > 0 && form.description.trim() !== ""
    case 1:
      return form.cardId !== ""
    case 2:
      return isOtherCategory(form) ? form.customCategoryName.trim() !== "" : form.categoryId !== ""
    case 3:
      return !form.isInstallment || (form.installments >= 2 && form.installments <= 48)
    case 4:
      return true
    case 5:
      return missingRequired(form).length === 0
    default:
      return true
  }
}

export function launchTypeLabel(form: WizardForm): string {
  const parts: string[] = []
  if (form.isInstallment) parts.push(`Parcelado ${form.installments}x`)
  if (form.isRecurring) parts.push("Recorrente")
  if (form.isScheduled) parts.push("Agendado")
  return parts.length > 0 ? parts.join(" · ") : "Única"
}

export function competenceWithLaunchType(form: WizardForm): string {
  return `${competenceLabel(form.competence)} · ${launchTypeLabel(form)}`
}

export interface AddTransactionPayload {
  card_id: string
  description: string
  amount: number
  type: TransactionType
  category_id?: string
  custom_category_name?: string
  date: string
  transaction_date?: string
  is_scheduled?: boolean
  scheduled_date?: string
  notes?: string
  installments?: number
  is_recurring?: boolean
  is_bill?: boolean
}

export interface UpdateTransactionPayload {
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  custom_category_name?: string
  date?: string
  notes: string | null
  is_recurring: boolean
  is_bill: boolean
  transaction_date: string | null
}

export function buildUpdateTransactionPayload(form: WizardForm, existing: Transaction): UpdateTransactionPayload {
  const isOther = isOtherCategory(form)
  const installmentSuffix = existing.description.match(/\s*\(\d+\/\d+\)$/)?.[0] ?? ""
  return {
    description: form.description.trim() + installmentSuffix,
    amount: parseBRLToNumber(form.amount),
    type: form.type,
    category_id: isOther ? null : (form.categoryId || null),
    custom_category_name: isOther ? form.customCategoryName.trim() : undefined,
    // Só envia a competência quando o mês mudou, para não alterar o dia original.
    date: form.competence !== existing.date.slice(0, 7) ? competenceDateFor(form.competence) : undefined,
    notes: form.notes.trim() || null,
    is_recurring: form.isRecurring,
    is_bill: form.isBill,
    transaction_date: form.transactionDate || null,
  }
}

export function buildAddTransactionPayload(form: WizardForm): AddTransactionPayload {
  const isOther = isOtherCategory(form)
  const competenceDate = competenceDateFor(form.competence)
  return {
    card_id: form.cardId,
    description: form.description.trim(),
    amount: parseBRLToNumber(form.amount),
    type: form.type,
    category_id: isOther ? undefined : (form.categoryId || undefined),
    custom_category_name: isOther ? form.customCategoryName.trim() : undefined,
    date: competenceDate,
    transaction_date: form.transactionDate || undefined,
    is_scheduled: form.isScheduled,
    scheduled_date: form.isScheduled ? (form.scheduledDate || competenceDate) : undefined,
    notes: form.notes.trim() || undefined,
    installments: form.isInstallment && form.installments >= 2 ? form.installments : undefined,
    is_recurring: form.isRecurring || undefined,
    is_bill: form.isBill || undefined,
  }
}
