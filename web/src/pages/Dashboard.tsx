import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { useFinanceStore } from "@/stores/finance-store"

export function Dashboard() {
  const navigate = useNavigate()
  const { cards, transactions, banks, categories, getCardBalance, getCardExpenses, valuesVisible, toggleValuesVisible } = useFinanceStore()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const totalBalance = cards
    .filter((c) => c.type === "CHECKING_ACCOUNT")
    .reduce((acc, c) => acc + getCardBalance(c.id), 0)

  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const monthTxs = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd)

  const realizedIncome = monthTxs
    .filter((t) => t.type === "INCOME" && t.is_realized)
    .reduce((acc, t) => acc + t.amount, 0)

  const realizedExpenses = monthTxs
    .filter((t) => t.type === "EXPENSE" && t.is_realized)
    .reduce((acc, t) => acc + t.amount, 0)

  const scheduledIncome = monthTxs
    .filter((t) => t.type === "INCOME" && t.is_scheduled && !t.is_realized)
    .reduce((acc, t) => acc + t.amount, 0)

  const scheduledExpenses = monthTxs
    .filter((t) => t.type === "EXPENSE" && t.is_scheduled && !t.is_realized)
    .reduce((acc, t) => acc + t.amount, 0)

  const monthlyIncome = realizedIncome + scheduledIncome
  const monthlyExpenses = realizedExpenses + scheduledExpenses

  const realizedBalance = realizedIncome - realizedExpenses
  const projectedBalance = monthlyIncome - monthlyExpenses

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  function getCategoryIcon(catId: string | null): { emoji: string | null; icon: string } {
    if (!catId) return { emoji: null, icon: "receipt_long" }
    const cat = categories.find((c) => c.id === catId)
    const value = cat?.icon ?? null
    if (value && /\p{Emoji_Presentation}/u.test(value)) {
      return { emoji: value, icon: "" }
    }
    return { emoji: null, icon: value ?? "receipt_long" }
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

  const hasData = cards.length > 0 || transactions.length > 0

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hero Balance Section */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-to-br from-surface-container-low to-surface-container-lowest ghost-border">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container/10 rounded-full blur-[100px]" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">
                  Patrimonio Total
                </p>
                <button
                  onClick={toggleValuesVisible}
                  className="opacity-40 hover:opacity-100 transition-opacity"
                  title={valuesVisible ? "Ocultar valores" : "Mostrar valores"}
                >
                  <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-base text-on-surface-variant" />
                </button>
              </div>
              <h2 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tighter text-on-surface mb-6">
                <MoneyValue value={totalBalance} />
              </h2>
              <div className="flex flex-wrap gap-4">
                {monthlyIncome > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-income-container/20 border border-income-container/30 text-income">
                    <Icon name="trending_up" className="text-sm" />
                    <span className="text-sm font-semibold">
                      +<MoneyValue value={monthlyIncome} /> este mes
                    </span>
                  </div>
                )}
                {scheduledExpenses > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-container/20 border border-primary-container/30 text-primary">
                    <Icon name="event_repeat" className="text-sm" />
                    <span className="text-sm font-semibold">
                      <MoneyValue value={scheduledExpenses} /> agendados
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="bg-surface-container-low rounded-xl p-6 ghost-border">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline font-bold text-lg">Fluxo Mensal</h3>
                <p className="text-xs text-on-surface-variant">Entradas vs saidas do mes</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-income" />
                  <span className="text-xs font-medium text-on-surface-variant">Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <span className="text-xs font-medium text-on-surface-variant">Despesas</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-income-container/20 flex items-center justify-center">
                    <Icon name="trending_up" className="text-income" />
                  </div>
                  <p className="text-sm text-on-surface-variant">Receitas</p>
                </div>
                <p className="text-2xl font-headline font-bold text-income"><MoneyValue value={realizedIncome} /></p>
                {scheduledIncome > 0 && (
                  <p className="text-xs text-on-surface-variant mt-1">+ <MoneyValue value={scheduledIncome} className="text-xs" /> previsto</p>
                )}
              </div>
              <div className="bg-surface-container-high rounded-xl p-5 ghost-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center">
                    <Icon name="trending_down" className="text-error" />
                  </div>
                  <p className="text-sm text-on-surface-variant">Despesas</p>
                </div>
                <p className="text-2xl font-headline font-bold text-error"><MoneyValue value={realizedExpenses} /></p>
                {scheduledExpenses > 0 && (
                  <p className="text-xs text-on-surface-variant mt-1">+ <MoneyValue value={scheduledExpenses} className="text-xs" /> previsto</p>
                )}
              </div>
            </div>

            {/* Saldo Realizado vs Previsto */}
            <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center">
                  <Icon name="check_circle" className="text-primary text-sm" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Saldo Realizado</p>
                  <p className={`text-lg font-headline font-bold ${realizedBalance >= 0 ? "text-income" : "text-error"}`}>
                    <MoneyValue value={realizedBalance} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center">
                  <Icon name="schedule" className="text-secondary text-sm" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Saldo Previsto</p>
                  <p className={`text-lg font-headline font-bold ${projectedBalance >= 0 ? "text-income" : "text-error"}`}>
                    <MoneyValue value={projectedBalance} />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Cards - inside left column to fill space */}
          {cards.filter(c => c.type === "CREDIT_CARD").length > 0 && (
            <div>
              <div className="mb-4">
                <h3 className="font-headline font-bold text-lg">Cartoes de Credito</h3>
                <p className="text-xs text-on-surface-variant">Faturas do mes atual</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.filter(c => c.type === "CREDIT_CARD").slice(0, 4).map((card) => {
                  const bank = banks.find((b) => b.id === card.bank_id)
                  const expenses = getCardExpenses(card.id)

                  return (
                    <div
                      key={card.id}
                      onClick={() => navigate(`/transactions?card_id=${card.id}`)}
                      className="bg-surface-container-low rounded-xl p-5 ghost-border hover:bg-surface-container-high transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: bank?.color ?? "#0066cc" }}
                        >
                          {bank?.name?.slice(0, 2).toUpperCase() ?? "CC"}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{card.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{bank?.name}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Fatura</p>
                          <p className="text-lg font-headline font-bold text-error"><MoneyValue value={expenses} /></p>
                        </div>
                        {card.credit_limit && (
                          <div className="text-right">
                            <p className="text-[10px] text-on-surface-variant uppercase">Limite</p>
                            <p className="text-xs font-semibold"><MoneyValue value={card.credit_limit} /></p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right Column */}
        <aside className="lg:col-span-4 flex flex-col gap-8">
          {/* Account Cards */}
          <div>
            <h3 className="font-headline font-bold text-lg mb-4 px-2">Minhas Contas</h3>
            <div className="flex flex-col gap-4">
              {cards.filter(c => c.type === "CHECKING_ACCOUNT").slice(0, 2).map((card, idx) => {
                const bank = banks.find((b) => b.id === card.bank_id)
                const balance = getCardBalance(card.id)

                return (
                  <div
                    key={card.id}
                    className={`${idx === 0 ? "glass-card" : "bg-surface-container-high"} rounded-xl p-5 ghost-border relative group hover:bg-surface-container-highest transition-all`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm font-bold text-on-surface">{card.name}</p>
                        <p className="text-xs text-on-surface-variant font-label">{bank?.name ?? "Conta"}</p>
                        {card.last_digits && (
                          <p className="text-xs text-on-surface-variant">**** {card.last_digits}</p>
                        )}
                      </div>
                      <Icon name={idx === 0 ? "credit_card" : "account_balance"} className="text-primary-fixed-dim" />
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Saldo</p>
                        <p className="text-2xl font-headline font-bold"><MoneyValue value={balance} /></p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {cards.filter(c => c.type === "CHECKING_ACCOUNT").length === 0 && (
                <div className="bg-surface-container-high rounded-xl p-6 ghost-border text-center">
                  <Icon name="account_balance_wallet" className="text-3xl text-on-surface-variant mb-2" />
                  <p className="text-sm text-on-surface-variant">Nenhuma conta cadastrada</p>
                  <button
                    onClick={() => navigate("/accounts")}
                    className="mt-3 text-xs font-bold text-primary uppercase tracking-wider"
                  >
                    Adicionar Conta
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface-container-low rounded-xl p-6 ghost-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-lg">Atividade</h3>
              <button
                onClick={() => navigate("/transactions")}
                className="text-xs font-bold text-primary uppercase tracking-wider"
              >
                Ver Tudo
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-center py-6">
                <Icon name="receipt_long" className="text-3xl text-on-surface-variant mb-2" />
                <p className="text-sm text-on-surface-variant">Nenhuma transacao registrada</p>
              </div>
            ) : (
              <div className="space-y-6">
                {recentTransactions.map((tx) => {
                  const catIcon = getCategoryIcon(tx.category_id)
                  return (
                  <div key={tx.id} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                      {catIcon.emoji ? (
                        <span className="text-lg">{catIcon.emoji}</span>
                      ) : (
                        <Icon
                          name={catIcon.icon}
                          className="text-on-surface-variant group-hover:text-primary"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{tx.description}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {getCategoryName(tx.category_id)} · {getCardName(tx.card_id)} · {tx.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tx.type === "INCOME" ? "text-income" : "text-error"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}<MoneyValue value={tx.amount} />
                      </p>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Empty State CTA */}
      {!hasData && (
        <div className="bg-surface-container-low rounded-xl p-10 ghost-border text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="rocket_launch" className="text-3xl text-primary" />
          </div>
          <p className="text-lg font-headline font-bold mb-2">Comece agora!</p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
            Adicione suas contas e cartoes para comecar a controlar suas financas
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/accounts")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all"
            >
              <Icon name="account_balance" className="text-lg" />
              Criar Conta
            </button>
            <button
              onClick={() => navigate("/cards")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm ghost-border hover:bg-surface-container-highest active:scale-95 transition-all"
            >
              <Icon name="credit_card" className="text-lg" />
              Adicionar Cartao
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
