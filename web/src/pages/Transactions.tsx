import { useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import type { TransactionType } from "@/types"

const CATEGORY_ICONS: Record<string, string> = {
  "Alimentacao": "restaurant",
  "Transporte": "directions_car",
  "Moradia": "home",
  "Saude": "health_and_safety",
  "Educacao": "school",
  "Lazer": "movie",
  "Compras": "shopping_bag",
  "Servicos": "build",
  "Investimentos": "trending_up",
  "Outros": "receipt_long",
}

export function Transactions() {
  const { transactions, cards, categories, banks, addTransaction, deleteTransaction, realizeTransaction } = useFinanceStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterCardId, setFilterCardId] = useState("")
  const [form, setForm] = useState({
    card_id: "",
    description: "",
    amount: "",
    type: "EXPENSE" as TransactionType,
    category_id: "",
    date: new Date().toISOString().slice(0, 10),
    is_scheduled: false,
    scheduled_date: "",
    notes: "",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.card_id || !form.description || !form.amount) return
    addTransaction({
      card_id: form.card_id,
      description: form.description,
      amount: Number(form.amount),
      type: form.type,
      category_id: form.category_id || undefined,
      date: form.date,
      is_scheduled: form.is_scheduled,
      scheduled_date: form.is_scheduled ? form.scheduled_date : undefined,
      notes: form.notes || undefined,
    })
    setForm({
      card_id: "",
      description: "",
      amount: "",
      type: "EXPENSE",
      category_id: "",
      date: new Date().toISOString().slice(0, 10),
      is_scheduled: false,
      scheduled_date: "",
      notes: "",
    })
    setDialogOpen(false)
  }

  function getCardName(cardId: string) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return "--"
    const bank = banks.find((b) => b.id === card.bank_id)
    return `${bank?.name ?? ""} ${card.name}`
  }

  function getCategoryInfo(catId: string | null) {
    if (!catId) return { icon: "receipt_long", name: "Sem categoria" }
    const cat = categories.find((c) => c.id === catId)
    if (!cat) return { icon: "receipt_long", name: "--" }
    const iconName = CATEGORY_ICONS[cat.name] ?? "receipt_long"
    return { icon: iconName, name: cat.name }
  }

  const filtered = filterCardId
    ? transactions.filter((t) => t.card_id === filterCardId)
    : transactions

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = []
    acc[tx.date].push(tx)
    return acc
  }, {})

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const totalMonth = sorted.reduce((acc, tx) => {
    return acc + (tx.type === "INCOME" ? tx.amount : -tx.amount)
  }, 0)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight">Transacoes</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie seus gastos e receitas</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all atmos-shadow"
        >
          <Icon name="add_circle" className="text-lg" />
          Nova Transacao
        </button>
      </div>

      {/* Search & Filters */}
      <section>
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant">
            <Icon name="search" />
          </div>
          <input
            className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all duration-300"
            placeholder="Buscar transacoes..."
            type="text"
          />
        </div>

        {cards.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterCardId("")}
              className={`px-5 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${
                !filterCardId
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Todas
            </button>
            {cards.map((c) => {
              const bank = banks.find((b) => b.id === c.bank_id)
              return (
                <button
                  key={c.id}
                  onClick={() => setFilterCardId(c.id)}
                  className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    filterCardId === c.id
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {bank?.name} - {c.name}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Insights */}
      {sorted.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass-card p-6 rounded-2xl relative overflow-hidden group ghost-border">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Icon name="analytics" className="text-8xl" filled />
            </div>
            <div className="relative z-10">
              <p className="text-on-surface-variant text-sm font-medium tracking-wide uppercase">Resumo</p>
              <h2 className="text-4xl font-headline font-extrabold mt-1 text-on-surface">{fmt(Math.abs(totalMonth))}</h2>
              <div className="mt-4 flex items-center gap-2">
                <span className={`flex items-center text-sm font-semibold px-2 py-0.5 rounded ${totalMonth >= 0 ? "text-tertiary bg-tertiary-container/20" : "text-error bg-error-container/20"}`}>
                  <Icon name={totalMonth >= 0 ? "trending_up" : "trending_down"} className="text-sm mr-1" />
                  {totalMonth >= 0 ? "Positivo" : "Negativo"}
                </span>
                <span className="text-on-surface-variant text-xs italic opacity-70">{sorted.length} transacao(es)</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-2xl ghost-border flex flex-col justify-between">
            <div>
              <p className="text-on-surface-variant text-sm font-medium uppercase">Recorrentes</p>
              <p className="text-xl font-bold mt-1">
                {transactions.filter(t => t.is_scheduled && !t.is_realized).length} pendente(s)
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-tertiary text-sm">
              <Icon name="event_repeat" className="text-base" />
              <span>Agendados</span>
            </div>
          </div>
        </section>
      )}

      {/* Transaction List */}
      {sorted.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 ghost-border flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
            <Icon name="receipt_long" className="text-3xl text-on-surface-variant" />
          </div>
          <p className="font-headline font-bold text-lg">Nenhuma transacao registrada</p>
          <p className="text-sm text-on-surface-variant mt-2">
            {cards.length === 0 ? "Primeiro adicione um cartao, depois crie transacoes" : "Adicione sua primeira transacao"}
          </p>
        </div>
      ) : (
        <section className="space-y-8">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-4 sticky top-16 bg-surface/80 backdrop-blur-md py-2 z-20">
                <h3 className="font-headline font-bold text-on-surface-variant text-sm tracking-[0.2em] uppercase">
                  {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                </h3>
                <span className="text-xs text-on-surface-variant/50 font-medium">{date}</span>
              </div>
              <div className="space-y-1">
                {txs.map((tx) => {
                  const cat = getCategoryInfo(tx.category_id)
                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center justify-between p-4 rounded-2xl hover:bg-surface-container-low transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon
                            name={cat.icon}
                            className={tx.type === "INCOME" ? "text-tertiary" : "text-primary"}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-on-surface">{tx.description}</p>
                            {tx.is_scheduled && !tx.is_realized && (
                              <span className="text-[10px] bg-tertiary-container/20 text-tertiary rounded-full px-2 py-0.5 font-medium">
                                Futuro
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            {cat.name} · {getCardName(tx.card_id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`font-headline font-bold ${tx.type === "INCOME" ? "text-tertiary" : "text-error"}`}>
                          {tx.type === "INCOME" ? "+" : "-"}{fmt(tx.amount)}
                        </p>
                        {tx.is_scheduled && !tx.is_realized && (
                          <button
                            onClick={() => realizeTransaction(tx.id)}
                            title="Marcar como realizado"
                            className="rounded-full p-1.5 hover:bg-tertiary-container/20 text-tertiary transition-colors"
                          >
                            <Icon name="check_circle" className="text-lg" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all"
                        >
                          <Icon name="delete" className="text-lg" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Nova Transacao">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Toggle */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(["EXPENSE", "INCOME"] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                    form.type === t
                      ? t === "EXPENSE"
                        ? "bg-error-container/20 text-error border border-error/20"
                        : "bg-tertiary-container/20 text-tertiary border border-tertiary/20"
                      : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright"
                  }`}
                >
                  {t === "EXPENSE" ? "Despesa" : "Receita"}
                </button>
              ))}
            </div>
          </div>

          {/* Card/Account Select */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Cartao / Conta</label>
            <select
              value={form.card_id}
              onChange={(e) => setForm({ ...form, card_id: e.target.value })}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
              required
            >
              <option value="">Selecione</option>
              {cards.map((c) => {
                const bank = banks.find((b) => b.id === c.bank_id)
                return (
                  <option key={c.id} value={c.id}>
                    {bank?.name} - {c.name}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Descricao</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Supermercado"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Valor (R$)</label>
            <input
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="100.00"
              type="number"
              step="0.01"
              min="0.01"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Categoria (opcional)</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Data</label>
            <input
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              type="date"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          {/* Scheduled Toggle */}
          <div className="flex items-center gap-3 p-4 bg-surface-container-high/50 rounded-xl">
            <input
              type="checkbox"
              id="is_scheduled"
              checked={form.is_scheduled}
              onChange={(e) => setForm({ ...form, is_scheduled: e.target.checked })}
              className="w-5 h-5 rounded border-none bg-surface-container-highest text-primary focus:ring-primary/30 focus:ring-offset-0"
            />
            <label htmlFor="is_scheduled" className="text-sm font-medium text-on-surface">
              Gasto futuro (agendado)
            </label>
          </div>

          {form.is_scheduled && (
            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Data prevista</label>
              <input
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                type="date"
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Observacoes (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionais..."
              rows={2}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`w-full py-4 rounded-xl font-headline font-bold text-sm active:scale-[0.98] transition-all relative overflow-hidden group ${
              form.type === "EXPENSE"
                ? "bg-gradient-to-br from-error to-error-container text-on-error shadow-[0_8px_32px_rgba(147,0,10,0.3)]"
                : "bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary shadow-[0_8px_32px_rgba(175,73,0,0.3)]"
            }`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-center gap-3 relative z-10">
              <Icon name="done_all" />
              <span>{form.type === "EXPENSE" ? "Registrar Despesa" : "Registrar Receita"}</span>
            </div>
          </button>
        </form>
      </Dialog>
    </div>
  )
}
