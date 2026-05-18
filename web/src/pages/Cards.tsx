import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { MoneyValue } from "@/components/ui/MoneyValue"
import { Dialog } from "@/components/ui/Dialog"
import { useFinanceStore } from "@/stores/finance-store"
import { toast } from "@/components/ui/Toast"
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

function fmtMonth(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export function Cards() {
  const navigate = useNavigate()
  const { cards: allCards, banks, addCard, updateCard, deleteCard, getCardExpensesByMonth, valuesVisible, toggleValuesVisible } = useFinanceStore()
  const cards = allCards.filter((c) => c.type === "CREDIT_CARD")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  })
  const [y, m] = selectedMonth.split("-").map(Number)
  const monthDate = new Date(y, m - 1, 1)

  const isOtherBank = form.bank_id === "__other__"

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(id: string) {
    const c = cards.find((x) => x.id === id)
    if (!c) return
    setEditingId(id)
    setForm({
      bank_id: c.bank_id ?? "",
      custom_bank_name: "",
      name: c.name,
      type: c.type,
      last_digits: c.last_digits ?? "",
      credit_limit: c.credit_limit != null ? String(c.credit_limit) : "",
      billing_day: c.billing_day != null ? String(c.billing_day) : "",
      due_day: c.due_day != null ? String(c.due_day) : "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!form.bank_id || (isOtherBank && !form.custom_bank_name)) || !form.name) return
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
    try {
      await toast.run(editingId ? "Salvando..." : "Criando cartão...", async () => {
        if (editingId) await Promise.resolve(updateCard(editingId, payload))
        else await Promise.resolve(addCard(payload))
      }, editingId ? "Cartão atualizado" : "Cartão criado")
      setForm({ ...EMPTY_FORM })
      setDialogOpen(false)
      setEditingId(null)
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cartão?")) return
    try {
      await toast.run("Excluindo cartão...", () => Promise.resolve(deleteCard(id)), "Cartão excluído")
    } catch {}
  }

  const totalFatura = cards.reduce((acc, c) => acc + getCardExpensesByMonth(c.id, selectedMonth), 0)

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Cartões</h1></div>
        <div className="actions">
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon name="add" className="text-[14px]" /> Novo cartão
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="hero-label" style={{ marginBottom: 6 }}>
              Fatura total dos cartões
              <button className="icon-btn" onClick={toggleValuesVisible} style={{ width: 28, height: 28 }}>
                <Icon name={valuesVisible ? "visibility" : "visibility_off"} className="text-[14px]" />
              </button>
            </div>
            <div className="hero-value" style={{ fontSize: 36, color: "var(--negative)" }}>
              <MoneyValue value={totalFatura} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="credit_card" className="text-[12px]" />
              {cards.length} cartão(es) cadastrado(s)
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

      {cards.length === 0 ? (
        <div className="panel empty">
          <div className="empty-title">Nenhum cartão cadastrado</div>
          <p>Adicione seu primeiro cartão para começar.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>
            <Icon name="add" className="text-[14px]" /> Novo cartão
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {cards.map((c) => {
            const bank = banks.find((b) => b.id === c.bank_id)
            const fatura = getCardExpensesByMonth(c.id, selectedMonth)
            return (
              <div
                key={c.id}
                className="card-row"
                style={{ padding: 18, alignItems: "flex-start", display: "block" }}
                onClick={() => navigate(`/transactions?card_id=${c.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="bi lg" style={{ background: bank?.color ?? "var(--c-porto)" }}>
                    {bank?.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-name">{c.name}</div>
                    <div className="card-sub">{bank?.name ?? "Banco custom"}{c.last_digits ? ` · **** ${c.last_digits}` : ""}</div>
                  </div>
                  <div className="row-actions">
                    <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); openEdit(c.id) }}>
                      <Icon name="edit" className="text-[13px]" />
                    </button>
                    <button className="icon-btn" style={{ width: 28, height: 28, color: "var(--negative)" }} onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}>
                      <Icon name="delete" className="text-[13px]" />
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="badge credit">Crédito</span>
                  {c.due_day && (
                    <span className="badge member">
                      <Icon name="event" className="text-[9px]" style={{ marginRight: 3 }} /> Vence dia {c.due_day}
                    </span>
                  )}
                  {c.billing_day && (
                    <span className="badge member">Fecha dia {c.billing_day}</span>
                  )}
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Fatura</div>
                    <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, color: "var(--negative)" }}>
                      <MoneyValue value={fatura} />
                    </div>
                  </div>
                  {c.credit_limit && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Limite</div>
                      <div className="num" style={{ marginTop: 4, fontSize: 13, color: "var(--text-2)" }}>
                        <MoneyValue value={c.credit_limit} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingId ? "Editar cartão" : "Novo cartão"}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Banco <span className="req">*</span></label>
            <select className="select" value={form.bank_id} onChange={(e) => setForm({ ...form, bank_id: e.target.value, custom_bank_name: "" })} required>
              <option value="">Selecione o banco</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="__other__">Outro</option>
            </select>
            {isOtherBank && (
              <input className="input" style={{ marginTop: 8 }} placeholder="Nome do banco" value={form.custom_bank_name} onChange={(e) => setForm({ ...form, custom_bank_name: e.target.value })} required />
            )}
          </div>

          <div className="field">
            <label className="label">Nome do cartão <span className="req">*</span></label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank Crédito" required />
          </div>

          <div className="field">
            <label className="label">Tipo</label>
            <div className="stepper-type">
              {(["CREDIT_CARD", "CHECKING_ACCOUNT"] as CardType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`type-card ${form.type === t ? "active" : ""}`}
                >
                  <div className="type-icon">
                    <Icon name={t === "CREDIT_CARD" ? "credit_card" : "account_balance"} className="text-[16px]" />
                  </div>
                  <div>
                    <div className="type-name">{t === "CREDIT_CARD" ? "Crédito" : "Conta Corrente"}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Últimos 4 dígitos (opcional)</label>
            <input
              className="input"
              value={form.last_digits}
              onChange={(e) => setForm({ ...form, last_digits: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="1234"
              maxLength={4}
            />
          </div>

          {form.type === "CREDIT_CARD" && (
            <>
              <div className="field">
                <label className="label">Limite de crédito</label>
                <input className="input" type="number" step="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} placeholder="8000" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Dia fechamento</label>
                  <input className="input" type="number" min={1} max={31} value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: e.target.value })} placeholder="15" />
                </div>
                <div className="field">
                  <label className="label">Dia vencimento</label>
                  <input className="input" type="number" min={1} max={31} value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} placeholder="25" />
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setDialogOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingId ? "Salvar" : "Criar cartão"}</button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
