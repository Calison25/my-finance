export interface Bank {
  id: string
  name: string
  code: string | null
  logo_url: string | null
  color: string
  is_default: boolean
  user_id: string | null
  household_id: string | null
}

export type CardType = "CHECKING_ACCOUNT" | "CREDIT_CARD"

export interface Card {
  id: string
  user_id: string
  bank_id: string
  household_id: string
  name: string
  type: CardType
  last_digits: string | null
  credit_limit: number | null
  billing_day: number | null
  due_day: number | null
  created_at: string
  bank?: Bank
}

export type TransactionType = "EXPENSE" | "INCOME"

export interface Transaction {
  id: string
  card_id: string
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  date: string
  transaction_date: string | null
  is_scheduled: boolean
  scheduled_date: string | null
  is_realized: boolean
  is_recurring: boolean
  is_bill: boolean
  recurring_transaction_id: string | null
  notes: string | null
  created_at: string
  classification: string | null
  category?: Category
}

export interface BalanceSummary {
  income: number
  expenses: number
  balance: number
}

export interface GroupSummary {
  income_total: number
  expense_total: number
  total: number
  count: number
}

export interface FinancialSummary {
  total_income: number
  realized_expenses: number
  scheduled_expenses: number
  total_expenses: number
  current_balance: number
  projected_balance: number
}

export interface TransactionSummary {
  total_month: number
  realized: BalanceSummary
  pending: BalanceSummary
  recurring: GroupSummary
  installments: GroupSummary
  scheduled: GroupSummary
  financial_summary: FinancialSummary
}

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string
  is_default: boolean
  user_id: string | null
  household_id: string | null
}

export interface DashboardSummary {
  total_balance: number
  monthly_expenses: number
  scheduled_expenses: number
  cards_summary: CardSummary[]
}

export interface CardSummary {
  card: Card
  balance: number
  monthly_expenses: number
}

export type UserRole = "owner" | "member"

export interface Member {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface HouseholdInvite {
  id: string
  household_id: string
  invited_email: string
  invited_by: string
  status: "pending" | "accepted" | "cancelled"
  accepted_at: string | null
  created_at: string
}
