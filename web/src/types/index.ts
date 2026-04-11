export interface Bank {
  id: string
  name: string
  code: string | null
  logo_url: string | null
  color: string
  is_default: boolean
  user_id: string | null
}

export type CardType = "CHECKING_ACCOUNT" | "CREDIT_CARD"

export interface Card {
  id: string
  user_id: string
  bank_id: string
  name: string
  type: CardType
  last_digits: string | null
  credit_limit: number | null
  billing_day: number | null
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
  is_scheduled: boolean
  scheduled_date: string | null
  is_realized: boolean
  is_recurring: boolean
  recurring_transaction_id: string | null
  notes: string | null
  created_at: string
  category?: Category
}

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string
  is_default: boolean
  user_id: string | null
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
