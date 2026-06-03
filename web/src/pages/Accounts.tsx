import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import { toast } from "@/components/ui/Toast"

const EMPTY_FORM = {
  bank_id: "",
  custom_bank_name: "",
  name: "",
  last_digits: "",
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export function Accounts() {
  const navigate = useNavigate()
  const { cards, banks, addCard, updateCard, deleteCard, getCardBalanceByMonth, valuesVisible, toggleValuesVisible, ensureMonths } = useFinanceStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  })

  useEffect(() => { ensureMonths([selectedMonth]) }, [selectedMonth, ensureMonths])

  const isOtherBank = form.bank_id === "__other__"
  const checkingAccounts = cards.filter((c) => c.type === "CHECKING_ACCOUNT")
  const [y, m] = selectedMonth.split("-").map(Number)
  const monthDate = new Date(y, m - 1, 1)

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(id: string) {
    const a = checkingAccounts.find((c) => c.id === id)
    if (!a) return
    setEditingId(id)
    setForm({ bank_id: a.bank_id ?? "", custom_bank_name: "", name: a.name, last_digits: a.last_digits ?? "" })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!form.bank_id || (isOtherBank && !form.custom_bank_name)) || !form.name) return

    const payload = {
      bank_id: isOtherBank ? undefined : form.bank_id,
      custom_bank_name: isOtherBank ? form.custom_bank_name : undefined,
      name: form.name,
      type: "CHECKING_ACCOUNT" as const,
      last_digits: form.last_digits || undefined,
    }

    try {
      await toast.run(editingId ? "Salvando..." : "Criando conta...", async () => {
        if (editingId) await Promise.resolve(updateCard(editingId, payload))
        else await Promise.resolve(addCard(payload))
      }, editingId ? "Conta atualizada" : "Conta criada")
      setForm({ ...EMPTY_FORM })
      setDialogOpen(false)
      setEditingId(null)
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conta?")) return
    try {
      await toast.run("Excluindo conta...", () => Promise.resolve(deleteCard(id)), "Conta excluída")
    } catch {}
  }

  const totalBalance = checkingAccounts.reduce((acc, c) => acc + getCardBalanceByMonth(c.id, selectedMonth), 0)

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>Contas bancárias</h1>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon name="add" className="text-[14px]" /> Nova conta
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="hero-label" style={{ marginBottom: 6 }}>
              Saldo total em contas
              <button className="icon-btn" onClick={toggleValuesVisible} style={{ width: 28, height: 28 }}>
                <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-[14px]" />
              </button>
            </div>
            <div className="hero-value" style={{ fontSize: 36, color: totalBalance >= 0 ? "var(--text)" : "var(--negative)" }}>
              <MoneyValue value={totalBalance} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="account_balance" className="text-[12px]" />
              {checkingAccounts.length} conta(s) cadastrada(s)
            </div>
          </div>
          <div className="month-nav">
            <button onClick={() => {
              const d = new Date(y, m - 2, 1)
              setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
            }}>
              <Icon name="chevron_left" className="text-[14px]" />
            </button>
            <span className="month-label">{fmtMonth(monthDate)}</span>
            <button onClick={() => {
              const d = new Date(y, m, 1)
              setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
            }}>
              <Icon name="chevron_right" className="text-[14px]" />
            </button>
          </div>
        </div>
      </div>

      {checkingAccounts.length === 0 ? (
        <div className="panel empty">
          <div className="empty-title">Nenhuma conta cadastrada</div>
          <p>Adicione sua conta corrente para começar.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>
            <Icon name="add" className="text-[14px]" /> Nova conta
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {checkingAccounts.map((a) => {
            const bank = banks.find((b) => b.id === a.bank_id)
            const balance = getCardBalanceByMonth(a.id, selectedMonth)
            return (
              <div
                key={a.id}
                className="acct-row"
                style={{ padding: 18, alignItems: "flex-start", display: "block" }}
                onClick={() => navigate(`/transactions?card_id=${a.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="bi lg" style={{ background: bank?.color ?? "var(--c-porto)" }}>
                    {bank?.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="acct-name">{a.name}</div>
                    <div className="acct-sub">{bank?.name ?? "Banco custom"}{a.last_digits ? ` · **** ${a.last_digits}` : ""}</div>
                  </div>
                  <div className="row-actions">
                    <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); openEdit(a.id) }}>
                      <Icon name="edit" className="text-[13px]" />
                    </button>
                    <button className="icon-btn" style={{ width: 28, height: 28, color: "var(--negative)" }} onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}>
                      <Icon name="delete" className="text-[13px]" />
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Saldo atual</div>
                  <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, color: balance >= 0 ? "var(--text)" : "var(--negative)" }}>
                    <MoneyValue value={balance} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingId ? "Editar conta" : "Nova conta bancária"}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Banco <span className="req">*</span></label>
            <select className="select" value={form.bank_id} onChange={(e) => setForm({ ...form, bank_id: e.target.value, custom_bank_name: "" })} required>
              <option value="">Selecione o banco</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="__other__">Outro</option>
            </select>
            {isOtherBank && (
              <input
                className="input"
                style={{ marginTop: 8 }}
                placeholder="Nome do banco"
                value={form.custom_bank_name}
                onChange={(e) => setForm({ ...form, custom_bank_name: e.target.value })}
                required
              />
            )}
          </div>
          <div className="field">
            <label className="label">Nome da conta <span className="req">*</span></label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Conta Salário" required />
          </div>
          <div className="field">
            <label className="label">Últimos 4 dígitos (opcional)</label>
            <input
              className="input"
              value={form.last_digits}
              onChange={(e) => setForm({ ...form, last_digits: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="1290"
              maxLength={4}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setDialogOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingId ? "Salvar" : "Criar conta"}</button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
