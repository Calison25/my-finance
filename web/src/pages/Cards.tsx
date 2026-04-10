import { useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import type { CardType } from "@/types"

export function Cards() {
  const { cards, banks, addCard, deleteCard, getCardBalance, getCardExpenses } = useFinanceStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    bank_id: "",
    name: "",
    type: "CREDIT_CARD" as CardType,
    last_digits: "",
    credit_limit: "",
    billing_day: "",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.bank_id || !form.name) return
    addCard({
      bank_id: form.bank_id,
      name: form.name,
      type: form.type,
      last_digits: form.last_digits || undefined,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : undefined,
      billing_day: form.billing_day ? Number(form.billing_day) : undefined,
    })
    setForm({ bank_id: "", name: "", type: "CREDIT_CARD", last_digits: "", credit_limit: "", billing_day: "" })
    setDialogOpen(false)
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight">Cartoes</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie seus cartoes de credito e debito</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all atmos-shadow"
        >
          <Icon name="add_circle" className="text-lg" />
          Novo Cartao
        </button>
      </div>

      {/* Empty State */}
      {cards.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 ghost-border flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
            <Icon name="credit_card" className="text-3xl text-on-surface-variant" />
          </div>
          <p className="font-headline font-bold text-lg">Nenhum cartao cadastrado</p>
          <p className="text-sm text-on-surface-variant mt-2">Adicione seu primeiro cartao para comecar</p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all"
          >
            <Icon name="add_circle" className="text-lg" />
            Novo Cartao
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const bank = banks.find((b) => b.id === card.bank_id)
            const balance = getCardBalance(card.id)
            const expenses = getCardExpenses(card.id)

            return (
              <div
                key={card.id}
                className="group relative bg-surface-container-high rounded-xl p-6 ghost-border hover:bg-surface-container-highest transition-all duration-300 min-h-[200px] flex flex-col justify-between"
              >
                <button
                  onClick={() => deleteCard(card.id)}
                  className="absolute top-4 right-4 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-container/20 text-on-surface-variant hover:text-error"
                >
                  <Icon name="delete" className="text-lg" />
                </button>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: bank?.color ?? "#0066cc" }}
                      >
                        {bank?.name?.slice(0, 2).toUpperCase() ?? "??"}
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant font-label">{bank?.name ?? "Custom"}</p>
                        <p className="font-bold">{card.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-[10px] bg-surface-container-highest rounded-full px-2.5 py-1 text-on-surface-variant font-label uppercase tracking-wider">
                      {card.type === "CREDIT_CARD" ? "Credito" : "Conta Corrente"}
                    </span>
                  </div>

                  {card.last_digits && (
                    <p className="text-base font-bold mt-4 tracking-wider text-on-surface-variant">
                      **** **** **** {card.last_digits}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4">
                  <div>
                    <p className="text-[10px] uppercase text-on-surface-variant font-label tracking-wider">
                      {card.type === "CREDIT_CARD" ? "Fatura" : "Saldo"}
                    </p>
                    <p className={`text-lg font-headline font-bold ${card.type === "CREDIT_CARD" ? "text-error" : balance >= 0 ? "text-primary" : "text-error"}`}>
                      {fmt(card.type === "CREDIT_CARD" ? expenses : balance)}
                    </p>
                  </div>
                  {card.type === "CREDIT_CARD" && card.credit_limit && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-on-surface-variant font-label tracking-wider">Limite</p>
                      <p className="text-sm font-semibold">{fmt(card.credit_limit)}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Adicionar Cartao">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Banco</label>
            <select
              value={form.bank_id}
              onChange={(e) => setForm({ ...form, bank_id: e.target.value })}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
              required
            >
              <option value="">Selecione o banco</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nome do cartao</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Nubank Credito"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(["CREDIT_CARD", "CHECKING_ACCOUNT"] as CardType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                    form.type === t
                      ? "bg-primary-container/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,102,204,0.1)]"
                      : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright"
                  }`}
                >
                  {t === "CREDIT_CARD" ? "Credito" : "Conta Corrente"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ultimos 4 digitos (opcional)</label>
            <input
              value={form.last_digits}
              onChange={(e) => setForm({ ...form, last_digits: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="1234"
              maxLength={4}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {form.type === "CREDIT_CARD" && (
            <>
              <div className="space-y-2">
                <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Limite de credito</label>
                <input
                  value={form.credit_limit}
                  onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                  placeholder="8000"
                  type="number"
                  step="0.01"
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dia do fechamento</label>
                <input
                  value={form.billing_day}
                  onChange={(e) => setForm({ ...form, billing_day: e.target.value })}
                  placeholder="15"
                  type="number"
                  min="1"
                  max="31"
                  className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-sm active:scale-[0.98] transition-all shadow-[0_8px_32px_rgba(0,102,204,0.3)]"
          >
            Adicionar
          </button>
        </form>
      </Dialog>
    </div>
  )
}
