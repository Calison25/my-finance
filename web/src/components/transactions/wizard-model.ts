import { competenceDateFor, competenceLabel, parseBRLToNumber } from "@/lib/transaction-format"
import type { TransactionType } from "@/types"

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
