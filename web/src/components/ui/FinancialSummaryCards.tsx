import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import type { FinancialSummary } from "@/types"

interface Props {
  summary: FinancialSummary
  className?: string
}

export function FinancialSummaryCards({ summary, className = "" }: Props) {
  const projectedPositive = summary.projected_balance >= 0
  const currentPositive = summary.current_balance >= 0

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Receita */}
      <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-income-container/20 flex items-center justify-center shrink-0">
            <Icon name="trending_up" className="text-income" />
          </div>
          <p className="text-sm text-on-surface-variant">Receita</p>
        </div>
        <p className="text-lg sm:text-2xl font-headline font-bold text-income truncate">
          <MoneyValue value={summary.total_income} />
        </p>
      </div>

      {/* Despesas */}
      <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center shrink-0">
            <Icon name="payments" className="text-error" />
          </div>
          <p className="text-sm text-on-surface-variant">Despesas</p>
        </div>
        <p className="text-lg sm:text-2xl font-headline font-bold text-error truncate">
          <MoneyValue value={summary.realized_expenses} />
        </p>
        {summary.scheduled_expenses > 0 && (
          <div className="mt-2 space-y-0.5">
            <p className="text-[11px] text-on-surface-variant">
              Previstas: <span className="font-semibold text-on-surface"><MoneyValue value={summary.scheduled_expenses} className="text-[11px]" /></span>
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Total: <span className="font-semibold text-error"><MoneyValue value={summary.total_expenses} className="text-[11px]" /></span>
            </p>
          </div>
        )}
      </div>

      {/* Saldo Atual */}
      <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
            <Icon name="account_balance" className="text-primary" />
          </div>
          <p className="text-sm text-on-surface-variant">Saldo Atual</p>
        </div>
        <p className={`text-lg sm:text-2xl font-headline font-bold truncate ${currentPositive ? "text-income" : "text-error"}`}>
          <MoneyValue value={summary.current_balance} />
        </p>
        <p className="text-[10px] text-on-surface-variant mt-1">Receita - despesas realizadas</p>
      </div>

      {/* Saldo Futuro */}
      <div className={`rounded-xl p-5 ghost-border ${projectedPositive ? "bg-surface-container-high" : "bg-error-container/10 border-error/20"}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${projectedPositive ? "bg-warning-container/20" : "bg-error-container/20"}`}>
            <Icon name="savings" className={projectedPositive ? "text-warning" : "text-error"} />
          </div>
          <p className="text-sm text-on-surface-variant">Saldo Futuro</p>
        </div>
        <p className={`text-lg sm:text-2xl font-headline font-bold truncate ${projectedPositive ? "text-income" : "text-error"}`}>
          <MoneyValue value={summary.projected_balance} />
        </p>
        <p className="text-[10px] text-on-surface-variant mt-1">Quanto ainda posso gastar</p>
      </div>
    </div>
  )
}
