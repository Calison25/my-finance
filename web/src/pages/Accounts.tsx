import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"

const EMPTY_FORM = {
  bank_id: "",
  custom_bank_name: "",
  name: "",
  last_digits: "",
}

export function Accounts() {
  const navigate = useNavigate()
  const { cards, banks, addCard, updateCard, deleteCard, getCardBalance, valuesVisible, toggleValuesVisible } = useFinanceStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const isOtherBank = form.bank_id === "__other__"
  const checkingAccounts = cards.filter((c) => c.type === "CHECKING_ACCOUNT")

  function openCreateDialog() {
    setEditingCardId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEditDialog(accountId: string) {
    const account = checkingAccounts.find((c) => c.id === accountId)
    if (!account) return
    setEditingCardId(accountId)
    setForm({
      bank_id: account.bank_id ?? "",
      custom_bank_name: "",
      name: account.name,
      last_digits: account.last_digits ?? "",
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
      type: "CHECKING_ACCOUNT" as const,
      last_digits: form.last_digits || undefined,
    }

    if (editingCardId) {
      updateCard(editingCardId, payload)
    } else {
      addCard(payload)
    }

    setForm({ ...EMPTY_FORM })
    closeDialog()
  }

  function getBankForCard(bankId: string) {
    return banks.find((b) => b.id === bankId)
  }

  const totalBalance = checkingAccounts.reduce((acc, c) => acc + getCardBalance(c.id), 0)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight">Contas Bancarias</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie suas contas correntes</p>
        </div>
        <button
          onClick={openCreateDialog}
          className="flex items-center gap-2 p-3 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all atmos-shadow"
        >
          <Icon name="add_circle" className="text-lg" />
          <span className="hidden sm:inline">Nova Conta</span>
        </button>
      </div>

      {/* Total Balance Card */}
      {checkingAccounts.length > 0 && (
        <div className="glass-card ghost-border rounded-xl p-8 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
          <div className="flex items-center gap-2 mb-1">
            <p className="text-on-surface-variant font-label text-sm">Saldo Total em Contas</p>
            <button
              onClick={toggleValuesVisible}
              className="opacity-40 hover:opacity-100 transition-opacity"
              title={valuesVisible ? "Ocultar valores" : "Mostrar valores"}
            >
              <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-base text-on-surface-variant" />
            </button>
          </div>
          <p className="font-headline font-bold text-4xl text-on-surface"><MoneyValue value={totalBalance} /></p>
          <div className="mt-4 flex items-center gap-2 text-primary font-medium text-sm">
            <Icon name="account_balance" className="text-base" />
            <span>{checkingAccounts.length} conta(s) cadastrada(s)</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {checkingAccounts.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 ghost-border flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
            <Icon name="account_balance" className="text-3xl text-on-surface-variant" />
          </div>
          <p className="font-headline font-bold text-lg">Nenhuma conta bancaria cadastrada</p>
          <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
            Adicione sua conta corrente para registrar seu salario e controlar gastos
          </p>
          <button
            onClick={openCreateDialog}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm active:scale-95 transition-all"
          >
            <Icon name="add_circle" className="text-lg" />
            Nova Conta
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {checkingAccounts.map((account) => {
            const bank = getBankForCard(account.bank_id)
            const balance = getCardBalance(account.id)

            return (
              <div
                key={account.id}
                onClick={() => navigate(`/transactions?card_id=${account.id}`)}
                className="group relative bg-surface-container-high rounded-xl p-6 ghost-border hover:bg-surface-container-highest transition-all duration-300 cursor-pointer"
              >
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditDialog(account.id) }}
                    className="rounded-full p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-primary-container/20 text-on-surface-variant hover:text-primary"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCard(account.id) }}
                    className="rounded-full p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-error-container/20 text-on-surface-variant hover:text-error"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-white font-bold text-sm"
                    style={{ backgroundColor: bank?.color ?? "#0066cc" }}
                  >
                    {bank?.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                  <div>
                    <p className="font-bold">{account.name}</p>
                    <p className="text-xs text-on-surface-variant">{bank?.name ?? "Custom"}</p>
                  </div>
                </div>

                {account.last_digits && (
                  <p className="text-xs text-on-surface-variant mb-4">Conta **** {account.last_digits}</p>
                )}

                <div>
                  <p className="text-xs text-on-surface-variant font-label uppercase tracking-wider">Saldo atual</p>
                  <p className={`text-2xl font-headline font-bold mt-1 ${balance >= 0 ? "text-primary" : "text-error"}`}>
                    <MoneyValue value={balance} />
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} title={editingCardId ? "Editar Conta" : "Nova Conta Bancaria"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Banco
            </label>
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
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Nome da conta
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Conta Salario Inter"
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Ultimos 4 digitos (opcional)
            </label>
            <input
              value={form.last_digits}
              onChange={(e) => setForm({ ...form, last_digits: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="1290"
              maxLength={4}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="bg-surface-container-high/50 rounded-xl p-4 ghost-border">
            <p className="text-xs text-on-surface-variant">
              Apos criar a conta, adicione uma transacao do tipo "Receita" para registrar seu salario.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-sm active:scale-[0.98] transition-all shadow-[0_8px_32px_rgba(0,102,204,0.3)]"
          >
            {editingCardId ? "Salvar" : "Criar Conta"}
          </button>
        </form>
      </Dialog>
    </div>
  )
}
