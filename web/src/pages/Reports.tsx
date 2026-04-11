import { useMemo, useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { useFinanceStore } from "@/stores/finance-store"

type PeriodMode = "month" | "quarter" | "semester" | "year" | "custom"

const PERIOD_LABELS: Record<PeriodMode, string> = {
  month: "Mes",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Ano",
  custom: "Personalizado",
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function getChartColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    income: style.getPropertyValue("--color-income").trim(),
    error: style.getPropertyValue("--color-error").trim(),
  }
}

function formatCompactValue(v: number): string {
  if (v === 0) return ""
  if (v >= 1000) {
    const k = v / 1000
    return k % 1 === 0 ? `${k.toFixed(0)}k` : `${k.toFixed(1).replace(".", ",")}k`
  }
  return v.toFixed(0)
}

function renderBarLabel(props: { x?: number; y?: number; width?: number; value?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, value = 0 } = props
  if (!value || value === 0) return null
  const text = formatCompactValue(value)
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
      fill="var(--color-on-surface)"
    >
      {text}
    </text>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-container-highest/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-2xl border border-outline-variant/20 text-sm">
      {label && <p className="text-on-surface-variant text-[10px] uppercase tracking-wider mb-2">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-on-surface-variant text-xs">{entry.name}</span>
            <span className="font-headline font-bold text-on-surface ml-auto">
              {entry.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Reports() {
  const { transactions, categories, cards, banks } = useFinanceStore()
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month")
  const now = new Date()
  const [customFrom, setCustomFrom] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [customTo, setCustomTo] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)

  const { startDate, endDate } = useMemo(() => {
    if (periodMode === "custom") {
      const [fy, fm] = customFrom.split("-").map(Number)
      const [ty, tm] = customTo.split("-").map(Number)
      const start = new Date(fy, fm - 1, 1)
      const end = new Date(ty, tm, 0)
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      }
    }

    const now = new Date()
    let start: Date
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    switch (periodMode) {
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "quarter": {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        start = new Date(now.getFullYear(), quarterStart, 1)
        break
      }
      case "semester": {
        const semesterStart = now.getMonth() < 6 ? 0 : 6
        start = new Date(now.getFullYear(), semesterStart, 1)
        break
      }
      case "year":
        start = new Date(now.getFullYear(), 0, 1)
        break
    }

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }
  }, [periodMode, customFrom, customTo])

  const filteredTransactions = useMemo(
    () => transactions.filter((t) => t.date >= startDate && t.date <= endDate),
    [transactions, startDate, endDate],
  )

  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "INCOME" && t.is_realized)
        .reduce((acc, t) => acc + t.amount, 0),
    [filteredTransactions],
  )

  const totalExpenses = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "EXPENSE" && t.is_realized)
        .reduce((acc, t) => acc + t.amount, 0),
    [filteredTransactions],
  )

  const periodBalance = totalIncome - totalExpenses

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>()
    filteredTransactions
      .filter((t) => t.type === "EXPENSE" && t.is_realized)
      .forEach((t) => {
        const key = t.category_id ?? "__none__"
        map.set(key, (map.get(key) ?? 0) + t.amount)
      })

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId)
        return {
          name: cat?.name ?? "Outros",
          value: amount,
          color: cat?.color ?? "#6B7280",
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions, categories])

  const incomeBySource = useMemo(() => {
    const map = new Map<string, number>()
    filteredTransactions
      .filter((t) => t.type === "INCOME" && t.is_realized)
      .forEach((t) => {
        const key = t.category_id ?? t.description
        const cat = categories.find((c) => c.id === t.category_id)
        const label = cat?.name ?? t.description
        map.set(label, (map.get(label) ?? 0) + t.amount)
      })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filteredTransactions, categories])

  const monthlyEvolution = useMemo(() => {
    const now = new Date()
    const months: Array<{ name: string; income: number; expenses: number }> = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = d.toISOString().slice(0, 10)
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)

      const monthTxs = transactions.filter((t) => t.date >= mStart && t.date <= mEnd && t.is_realized)

      months.push({
        name: MONTH_NAMES[d.getMonth()],
        income: monthTxs.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0),
        expenses: monthTxs.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0),
      })
    }

    return months
  }, [transactions])

  const topExpenses = useMemo(
    () =>
      [...filteredTransactions]
        .filter((t) => t.type === "EXPENSE" && t.is_realized)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [filteredTransactions],
  )

  const maxExpense = topExpenses[0]?.amount ?? 1

  const insights = useMemo(() => {
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    const topCategory = expensesByCategory[0]
    const topCategoryPct = totalExpenses > 0 && topCategory ? ((topCategory.value / totalExpenses) * 100).toFixed(0) : "0"

    const recurringExpenses = filteredTransactions.filter(
      (t) => t.type === "EXPENSE" && t.is_realized && t.is_recurring,
    )
    const recurringTotal = recurringExpenses.reduce((a, t) => a + t.amount, 0)
    const recurringPct = totalExpenses > 0 ? ((recurringTotal / totalExpenses) * 100).toFixed(0) : "0"

    const pendingTotal = filteredTransactions
      .filter((t) => !t.is_realized)
      .reduce((a, t) => a + t.amount, 0)

    return { savingsRate, topCategory, topCategoryPct, recurringPct, pendingTotal }
  }, [totalIncome, totalExpenses, expensesByCategory, filteredTransactions])

  function getSavingsColor(rate: number) {
    if (rate >= 20) return "text-income"
    if (rate >= 5) return "text-warning"
    return "text-error"
  }

  function getSavingsIcon(rate: number) {
    if (rate >= 20) return "trending_up"
    if (rate >= 5) return "trending_flat"
    return "trending_down"
  }

  function getCardName(cardId: string): string {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return ""
    const bank = banks.find((b) => b.id === card.bank_id)
    return bank ? `${bank.name} · ${card.name}` : card.name
  }

  function getCategoryName(catId: string | null) {
    if (!catId) return "Outros"
    return categories.find((c) => c.id === catId)?.name ?? "Outros"
  }

  const chartColors = useMemo(() => getChartColors(), [])

  const hasData = filteredTransactions.length > 0

  return (
    <div className="space-y-8">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl">Relatorios</h1>
          <p className="text-xs text-on-surface-variant">Analise detalhada das suas financas</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
          <div className="flex gap-1 bg-surface-container-high rounded-full p-1 ghost-border overflow-x-auto w-full sm:w-auto scrollbar-thin">
            {(Object.keys(PERIOD_LABELS) as PeriodMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setPeriodMode(mode)}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  periodMode === mode
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                {PERIOD_LABELS[mode]}
              </button>
            ))}
          </div>
          {periodMode === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-surface-container-high border-none rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-on-surface-variant text-sm">ate</span>
              <input
                type="month"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-surface-container-high border-none rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
              />
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="bg-surface-container-low rounded-xl p-10 ghost-border text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="bar_chart" className="text-3xl text-primary" />
          </div>
          <p className="text-lg font-headline font-bold mb-2">Sem dados no periodo</p>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            Adicione transacoes para visualizar seus relatorios financeiros
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-income-container/20 flex items-center justify-center">
                  <Icon name="trending_up" className="text-income" />
                </div>
                <p className="text-sm text-on-surface-variant">Receitas</p>
              </div>
              <p className="text-2xl font-headline font-bold text-income">
                <MoneyValue value={totalIncome} />
              </p>
            </div>
            <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center">
                  <Icon name="trending_down" className="text-error" />
                </div>
                <p className="text-sm text-on-surface-variant">Despesas</p>
              </div>
              <p className="text-2xl font-headline font-bold text-error">
                <MoneyValue value={totalExpenses} />
              </p>
            </div>
            <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
                  <Icon name="account_balance_wallet" className="text-primary" />
                </div>
                <p className="text-sm text-on-surface-variant">Saldo do Periodo</p>
              </div>
              <p className={`text-2xl font-headline font-bold ${periodBalance >= 0 ? "text-income" : "text-error"}`}>
                <MoneyValue value={periodBalance} />
              </p>
            </div>
          </div>

          {/* Donut + Income Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Expenses by Category - Donut */}
            <div className="lg:col-span-7 bg-surface-container-low rounded-xl p-6 ghost-border">
              <h3 className="font-headline font-bold text-lg mb-1">Despesas por Categoria</h3>
              <p className="text-xs text-on-surface-variant mb-6">Distribuicao dos gastos no periodo</p>

              {expensesByCategory.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-10">Nenhuma despesa no periodo</p>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-56 h-56 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          dataKey="value"
                          stroke="none"
                        >
                          {expensesByCategory.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    {expensesByCategory.map((cat) => {
                      const pct = totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : "0"
                      return (
                        <div key={cat.name} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm flex-1 truncate">{cat.name}</span>
                          <span className="text-xs text-on-surface-variant">{pct}%</span>
                          <span className="text-sm font-bold text-error w-28 text-right">
                            <MoneyValue value={cat.value} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Income Sources - List with progress bars */}
            <div className="lg:col-span-5 bg-surface-container-low rounded-xl p-6 ghost-border">
              <h3 className="font-headline font-bold text-lg mb-1">Fontes de Receita</h3>
              <p className="text-xs text-on-surface-variant mb-6">Principais origens de entrada</p>

              {incomeBySource.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-10">Nenhuma receita no periodo</p>
              ) : (
                <div className="space-y-4">
                  {incomeBySource.map((source) => {
                    const maxIncome = incomeBySource[0]?.value ?? 1
                    const pct = (source.value / maxIncome) * 100
                    const pctOfTotal = totalIncome > 0 ? ((source.value / totalIncome) * 100).toFixed(0) : "0"
                    return (
                      <div key={source.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate flex-1">{source.name}</span>
                          <span className="text-xs text-on-surface-variant mr-2">{pctOfTotal}%</span>
                          <span className="text-sm font-bold text-income w-28 text-right">
                            <MoneyValue value={source.value} />
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: chartColors.income }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Monthly Evolution */}
          <div className="bg-surface-container-low rounded-xl p-4 sm:p-6 ghost-border">
            <h3 className="font-headline font-bold text-lg mb-1">Evolucao Mensal</h3>
            <p className="text-xs text-on-surface-variant mb-6">Receitas vs despesas nos ultimos 6 meses</p>

            <div className="w-full -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyEvolution} margin={{ left: 0, right: 5, top: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-on-surface-variant)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-on-surface-variant">{value}</span>
                    )}
                  />
                  <Bar dataKey="income" name="Receitas" fill={chartColors.income} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="income" content={renderBarLabel} />
                  </Bar>
                  <Bar dataKey="expenses" name="Despesas" fill={chartColors.error} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="expenses" content={renderBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 + Financial Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top 5 Expenses */}
            <div className="bg-surface-container-low rounded-xl p-6 ghost-border">
              <h3 className="font-headline font-bold text-lg mb-1">Top 5 Maiores Gastos</h3>
              <p className="text-xs text-on-surface-variant mb-6">Maiores despesas do periodo</p>

              {topExpenses.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-6">Nenhuma despesa no periodo</p>
              ) : (
                <div className="space-y-4">
                  {topExpenses.map((tx, idx) => {
                    const pct = (tx.amount / maxExpense) * 100
                    return (
                      <div key={tx.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs text-on-surface-variant font-bold w-5">{idx + 1}.</span>
                            <span className="text-sm font-medium truncate">{tx.description}</span>
                          </div>
                          <span className="text-sm font-bold text-error ml-3">
                            <MoneyValue value={tx.amount} />
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className="h-full bg-error rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-on-surface-variant pl-7">
                          {getCategoryName(tx.category_id)} · {getCardName(tx.card_id)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Financial Health Insights */}
            <div className="bg-surface-container-low rounded-xl p-6 ghost-border">
              <h3 className="font-headline font-bold text-lg mb-1">Saude Financeira</h3>
              <p className="text-xs text-on-surface-variant mb-6">Insights sobre seus habitos</p>

              <div className="space-y-4">
                {/* Savings Rate */}
                <div className="bg-surface-container-high rounded-xl p-4 ghost-border flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    insights.savingsRate >= 20 ? "bg-income-container/20" : insights.savingsRate >= 5 ? "bg-warning-container/20" : "bg-error-container/20"
                  }`}>
                    <Icon name={getSavingsIcon(insights.savingsRate)} className={getSavingsColor(insights.savingsRate)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Taxa de Poupanca</p>
                    <p className="text-xs text-on-surface-variant">
                      Voce poupou{" "}
                      <span className={`font-bold ${getSavingsColor(insights.savingsRate)}`}>
                        {insights.savingsRate.toFixed(1)}%
                      </span>{" "}
                      da sua renda
                    </p>
                  </div>
                </div>

                {/* Top Category */}
                {insights.topCategory && (
                  <div className="bg-surface-container-high rounded-xl p-4 ghost-border flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center">
                      <Icon name="pie_chart" className="text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Maior Categoria</p>
                      <p className="text-xs text-on-surface-variant">
                        Voce gastou{" "}
                        <span className="font-bold text-error">{insights.topCategoryPct}%</span> em{" "}
                        <span className="font-bold">{insights.topCategory.name}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Recurring Expenses */}
                <div className="bg-surface-container-high rounded-xl p-4 ghost-border flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center">
                    <Icon name="repeat" className="text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Gastos Fixos</p>
                    <p className="text-xs text-on-surface-variant">
                      <span className="font-bold">{insights.recurringPct}%</span> dos gastos sao recorrentes
                    </p>
                  </div>
                </div>

                {/* Pending */}
                {insights.pendingTotal > 0 && (
                  <div className="bg-surface-container-high rounded-xl p-4 ghost-border flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
                      <Icon name="schedule" className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Previsto Pendente</p>
                      <p className="text-xs text-on-surface-variant">
                        Voce tem{" "}
                        <span className="font-bold">
                          <MoneyValue value={insights.pendingTotal} />
                        </span>{" "}
                        previsto para este periodo
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
