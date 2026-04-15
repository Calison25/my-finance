import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import type { CardType } from "@/types"

const EMPTY_FORM = {
  bank_id: "",
  custom_bank_name: "",
  name: "",
  type: "CREDIT_CARD" as CardType,
  last_digits: "",
  credit_limit: "",
  billing_day: "",
  due_day: "",
}

export function Cards() {
  const navigate = useNavigate()
  const { cards: allCards, banks, addCard, updateCard, deleteCard, getCardBalance, getCardExpensesByMonth, valuesVisible, toggleValuesVisible } = useFinanceStore()
  const cards = allCards.filter((c) => c.type === "CREDIT_CARD")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  })
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const isOtherBank = form.bank_id === "__other__"

  function openCreateDialog() {
    setEditingCardId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEditDialog(cardId: string) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    setEditingCardId(cardId)
    setForm({
      bank_id: card.bank_id ?? "",
      custom_bank_name: "",
      name: card.name,
      type: card.type,
      last_digits: card.last_digits ?? "",
      credit_limit: card.credit_limit != null ? String(card.credit_limit) : "",
      billing_day: card.billing_day != null ? String(card.billing_day) : "",
      due_day: card.due_day != null ? String(card.due_day) : "",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingCardId(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!form.bank_id || isOtherBank && !form.custom_bank_name) || !form.name) return

    const payload = {
      bank_id: isOtherBank ? undefined : form.bank_id,
      custom_bank_name: isOtherBank ? form.custom_bank_name : undefined,
      name: form.name,
      type: form.type,
      last_digits: form.last_digits || undefined,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : undefined,
      billing_day: form.billing_day ? Number(form.billing_day) : undefined,
      due_day: form.due_day ? Number(form.due_day) : undefined,
    }

    if (editingCardId) {
      updateCard(editingCardId, payload)
    } else {
      addCard(payload)
    }

    setForm({ ...EMPTY_FORM })
    closeDialog()
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight">Cartoes</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie seus cartoes de credito e debito</p>
        </div>
        <button
          onClick={openCreateDialog}
          className="flex items-center gap-2 p-3 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all atmos-shadow"
        >
          <Icon name="add_circle" className="text-lg" />
          <span className="hidden sm:inline">Novo Cartao</span>
        </button>
      </div>

      {/* Total Card */}
      {cards.length > 0 && (
        <div className="glass-card ghost-border rounded-xl p-8 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-error/10 rounded-full blur-3xl group-hover:bg-error/20 transition-all duration-700 pointer-events-none" />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-on-surface-variant font-label text-sm">Fatura Total dos Cartoes</p>
              <button
                onClick={toggleValuesVisible}
                className="opacity-40 hover:opacity-100 transition-opacity"
                title={valuesVisible ? "Ocultar valores" : "Mostrar valores"}
              >
                <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-base text-on-surface-variant" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const [y, m] = selectedMonth.split("-").map(Number)
                  const prev = new Date(y, m - 2, 1)
                  setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`)
                }}
                className="p-1.5 rounded-lg hover:bg-surface-container-highest transition-colors"
              >
                <Icon name="chevron_left" className="text-lg text-on-surface-variant" />
              </button>
              <span className="text-sm font-medium text-on-surface min-w-[100px] text-center capitalize">
                {new Date(Number(selectedMonth.split("-")[0]), Number(selectedMonth.split("-")[1]) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => {
                  const [y, m] = selectedMonth.split("-").map(Number)
                  const next = new Date(y, m, 1)
                  setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`)
                }}
                className="p-1.5 rounded-lg hover:bg-surface-container-highest transition-colors"
              >
                <Icon name="chevron_right" className="text-lg text-on-surface-variant" />
              </button>
            </div>
          </div>
          <p className="font-headline font-bold text-4xl text-error"><MoneyValue value={cards.reduce((acc, c) => acc + getCardExpensesByMonth(c.id, selectedMonth), 0)} /></p>
          <div className="flex items-center gap-6 mt-4 flex-wrap">
            <div className="flex items-center gap-2 text-on-surface-variant font-medium text-sm">
              <Icon name="credit_card" className="text-base" />
              <span>{cards.length} cartao(es) cadastrado(s)</span>
            </div>
            {(() => {
              const totalLimit = cards.reduce((acc, c) => acc + (c.credit_limit ?? 0), 0)
              return totalLimit > 0 ? (
                <div className="flex items-center gap-2 text-on-surface-variant font-medium text-sm">
                  <Icon name="account_balance_wallet" className="text-base" />
                  <span>Limite total: <MoneyValue value={totalLimit} /></span>
                </div>
              ) : null
            })()}
          </div>
        </div>
      )}

      {/* Empty State */}
      {cards.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 ghost-border flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
            <Icon name="credit_card" className="text-3xl text-on-surface-variant" />
          </div>
          <p className="font-headline font-bold text-lg">Nenhum cartao cadastrado</p>
          <p className="text-sm text-on-surface-variant mt-2">Adicione seu primeiro cartao para comecar</p>
          <button
            onClick={openCreateDialog}
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
            const expenses = getCardExpensesByMonth(card.id, selectedMonth)

            return (
              <div
                key={card.id}
                onClick={() => navigate(`/transactions?card_id=${card.id}`)}
                className="group relative bg-surface-container-high rounded-xl p-6 ghost-border hover:bg-surface-container-highest transition-all duration-300 min-h-[200px] flex flex-col justify-between cursor-pointer"
              >
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditDialog(card.id) }}
                    className="rounded-full p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-primary-container/20 text-on-surface-variant hover:text-primary"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCard(card.id) }}
                    className="rounded-full p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-error-container/20 text-on-surface-variant hover:text-error"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </div>

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

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] bg-surface-container-highest rounded-full px-2.5 py-1 text-on-surface-variant font-label uppercase tracking-wider">
                      {card.type === "CREDIT_CARD" ? "Credito" : "Conta Corrente"}
                    </span>
                    {card.type === "CREDIT_CARD" && card.billing_day && (
                      <span className="text-[10px] bg-surface-container-highest rounded-full px-2.5 py-1 text-on-surface-variant font-label tracking-wider">
                        Fechamento: dia {card.billing_day}
                      </span>
                    )}
                    {card.type === "CREDIT_CARD" && card.due_day && (
                      <span className="text-[10px] bg-surface-container-highest rounded-full px-2.5 py-1 text-on-surface-variant font-label tracking-wider">
                        Vencimento: dia {card.due_day}
                      </span>
                    )}
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
                      <MoneyValue value={card.type === "CREDIT_CARD" ? expenses : balance} />
                    </p>
                  </div>
                  {card.type === "CREDIT_CARD" && card.credit_limit && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-on-surface-variant font-label tracking-wider">Limite</p>
                      <p className="text-sm font-semibold"><MoneyValue value={card.credit_limit} /></p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} title={editingCardId ? "Editar Cartao" : "Adicionar Cartao"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Banco</label>
            <select
              value={form.bank_id}
              onChange={(e) => setForm({ ...form, bank_id: e.target.value, custom_bank_name: "" })}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface focus:ring-1 focus:ring-primary/50"
              required
            >
              <option value="">Selecione o banco</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              <option value="__other__">Outro</option>
            </select>
            {isOtherBank && (
              <input
                value={form.custom_bank_name}
                onChange={(e) => setForm({ ...form, custom_bank_name: e.target.value })}
                placeholder="Nome do banco"
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 mt-2"
                required
              />
            )}
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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dia do vencimento</label>
                  <input
                    value={form.due_day}
                    onChange={(e) => setForm({ ...form, due_day: e.target.value })}
                    placeholder="25"
                    type="number"
                    min="1"
                    max="31"
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-sm active:scale-[0.98] transition-all shadow-[0_8px_32px_rgba(0,102,204,0.3)]"
          >
            {editingCardId ? "Salvar" : "Adicionar"}
          </button>
        </form>
      </Dialog>
    </div>
  )
}
