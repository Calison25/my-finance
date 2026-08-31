import { Icon } from "@/components/ui/Icon"
import { categoryIconFor, competenceLabel, formatCentsToBRL, shiftCompetence } from "@/lib/transaction-format"
import type { Bank, Card, Category, TransactionType } from "@/types"
import { isOtherCategory, launchTypeLabel, missingRequired, type WizardForm } from "./wizard-model"

interface StepProps {
  form: WizardForm
  patch: (p: Partial<WizardForm>) => void
}

export function ValorStep({ form, patch }: StepProps) {
  return (
    <>
      <div className="wiz-type-toggle">
        {(["EXPENSE", "INCOME"] as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => patch(t === "INCOME" && form.srcKind === "card" ? { type: t, srcKind: "account", cardId: "" } : { type: t })}
            className={`${t === "EXPENSE" ? "despesa" : "receita"} ${form.type === t ? "active" : ""}`}
          >
            {t === "EXPENSE" ? "Despesa" : "Receita"}
          </button>
        ))}
      </div>

      <div className="field">
        <label className="label">Valor <span className="req">*</span></label>
        <div className="wiz-amount-box">
          <div className="wiz-amount-prefix">R$</div>
          <input
            className={`wiz-amount-input ${form.type === "EXPENSE" ? "despesa" : "receita"}`}
            value={form.amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              const cents = raw ? parseInt(raw, 10) : 0
              patch({ amount: formatCentsToBRL(cents) })
            }}
            placeholder="0,00"
            inputMode="numeric"
            autoFocus
          />
        </div>
      </div>

      <div className="field">
        <label className="label">Descrição <span className="req">*</span></label>
        <input
          className="input"
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Ex: Supermercado"
        />
      </div>
    </>
  )
}

interface PagamentoStepProps extends StepProps {
  cards: Card[]
  banks: Bank[]
  editMode?: boolean
}

export function PagamentoStep({ form, patch, cards, banks, editMode }: PagamentoStepProps) {
  const filteredCards = cards.filter((c) => (form.srcKind === "card" ? c.type === "CREDIT_CARD" : c.type === "CHECKING_ACCOUNT"))

  return (
    <div className="modal-section">
      <div className="modal-section-head">Pagar com <span style={{ color: "var(--negative)" }}>*</span></div>
      <div className="src-block">
        <div className="src-tabs">
          <button
            type="button"
            className={`src-tab ${form.srcKind === "account" ? "active" : ""}`}
            onClick={() => patch({ srcKind: "account", cardId: "" })}
            disabled={editMode}
          >
            <Icon name="account_balance" className="text-[14px]" /> Conta
          </button>
          <button
            type="button"
            className={`src-tab ${form.srcKind === "card" ? "active" : ""}`}
            onClick={() => patch({ srcKind: "card", cardId: "" })}
            disabled={editMode || form.type === "INCOME"}
          >
            <Icon name="credit_card" className="text-[14px]" /> Cartão
          </button>
        </div>
        <div className="src-list-inner">
          {filteredCards.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
              Nenhuma {form.srcKind === "card" ? "cartão" : "conta"} cadastrada
            </div>
          ) : (
            filteredCards.map((c) => {
              const bank = banks.find((b) => b.id === c.bank_id)
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`src-item ${form.cardId === c.id ? "active" : ""}`}
                  onClick={editMode ? undefined : () => patch({ cardId: c.id })}
                  disabled={editMode && form.cardId !== c.id}
                >
                  <div className="bi sm" style={{ background: bank?.color ?? "var(--c-porto)" }}>
                    {bank?.name?.slice(0, 2).toUpperCase() ?? "?"}
                  </div>
                  <span className="src-name">{c.name}</span>
                  <span className="src-trailing" style={{ color: "var(--text-3)" }}>{bank?.name}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
      {editMode && <span className="help">A origem não pode ser alterada na edição.</span>}
    </div>
  )
}

interface CategoriaStepProps extends StepProps {
  categories: Category[]
}

export function CategoriaStep({ form, patch, categories }: CategoriaStepProps) {
  const q = form.categorySearch.trim().toLowerCase()
  const list = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories
  const isOther = isOtherCategory(form)

  return (
    <div className="field">
      <label className="label">Categoria <span className="req">*</span></label>
      <input
        className="input"
        value={form.categorySearch}
        onChange={(e) => patch({ categorySearch: e.target.value })}
        placeholder="Buscar categoria"
      />
      <div className="cat-pills" style={{ marginTop: 8 }}>
        <button type="button" className={`cat-pill ${isOther ? "active" : ""}`} onClick={() => patch({ categoryId: "__other__" })}>
          <Icon name="add" className="text-[12px]" /> Outra
        </button>
        {list.map((c) => (
          <button key={c.id} type="button" className={`cat-pill ${form.categoryId === c.id ? "active" : ""}`} onClick={() => patch({ categoryId: c.id })}>
            <Icon name={categoryIconFor(c)} className="text-[12px]" />
            {c.name}
          </button>
        ))}
        {list.length === 0 && <span className="help">Nenhuma categoria encontrada.</span>}
      </div>
      {isOther && (
        <input
          className="input"
          style={{ marginTop: 8 }}
          placeholder="Nome da nova categoria"
          value={form.customCategoryName}
          onChange={(e) => patch({ customCategoryName: e.target.value })}
          autoFocus
        />
      )}
    </div>
  )
}

interface QuandoStepProps extends StepProps {
  editMode?: boolean
}

export function QuandoStep({ form, patch, editMode }: QuandoStepProps) {
  const total = (() => {
    const raw = form.amount.replace(/\D/g, "")
    return raw ? parseInt(raw, 10) / 100 : 0
  })()
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <>
      <div className="field">
        <label className="label">Mês de competência <span className="req">*</span></label>
        <div className="month-nav full">
          <button type="button" onClick={() => patch({ competence: shiftCompetence(form.competence, -1) })}>
            <Icon name="chevron_left" className="text-[14px]" />
          </button>
          <span className="month-label">{competenceLabel(form.competence)}</span>
          <button type="button" onClick={() => patch({ competence: shiftCompetence(form.competence, 1) })}>
            <Icon name="chevron_right" className="text-[14px]" />
          </button>
        </div>
        <span className="help">A transação aparecerá em <strong>{competenceLabel(form.competence)}</strong></span>
      </div>

      <div className="field">
        <label className="label">Data real da transação</label>
        <input
          type="date"
          className="input"
          value={form.transactionDate}
          onChange={(e) => patch({ transactionDate: e.target.value })}
        />
        <span className="help">Quando o gasto de fato aconteceu. Se vazio, será considerado o dia 1 do mês de competência.</span>
      </div>

      <div className="field">
        <label className="label">Tipo de lançamento</label>
        <div className="opt-pills">
          <button
            type="button"
            className={`opt-pill ${!form.isInstallment && !form.isScheduled && !form.isRecurring ? "active" : ""}`}
            onClick={() => patch(editMode ? { isRecurring: false } : { isInstallment: false, isScheduled: false, isRecurring: false })}
          >
            Única
          </button>
          {!editMode && (
            <button
              type="button"
              className={`opt-pill ${form.isInstallment ? "active" : ""}`}
              disabled={form.isRecurring}
              onClick={() => patch({ isInstallment: !form.isInstallment })}
            >
              <Icon name="payments" className="text-[12px]" /> Parcelado
            </button>
          )}
          {!editMode && (
            <button
              type="button"
              className={`opt-pill ${form.isScheduled ? "active" : ""}`}
              onClick={() => patch({ isScheduled: !form.isScheduled })}
            >
              <Icon name="schedule" className="text-[12px]" /> Agendado
            </button>
          )}
          <button
            type="button"
            className={`opt-pill ${form.isRecurring ? "active" : ""}`}
            disabled={form.isInstallment}
            onClick={() => patch({ isRecurring: !form.isRecurring })}
          >
            <Icon name="repeat" className="text-[12px]" /> Recorrente
          </button>
        </div>
      </div>

      {form.isInstallment && (
        <div className="field">
          <label className="label">Parcelas (2–48)</label>
          <div className="wiz-stepper">
            <span className="wiz-stepper-label">Parcelas</span>
            <button type="button" className="wiz-stepper-btn" onClick={() => patch({ installments: Math.max(2, form.installments - 1) })}>−</button>
            <span className="wiz-stepper-value">{form.installments}</span>
            <button type="button" className="wiz-stepper-btn" onClick={() => patch({ installments: Math.min(48, form.installments + 1) })}>+</button>
          </div>
          {total > 0 && (
            <span className="help">
              {fmt(total)} em <strong>{form.installments}x</strong> de <strong>{fmt(total / form.installments)}</strong>
            </span>
          )}
        </div>
      )}

      {!editMode && form.isScheduled && (
        <div className="field">
          <label className="label">Data prevista</label>
          <input className="input" type="date" value={form.scheduledDate} onChange={(e) => patch({ scheduledDate: e.target.value })} />
        </div>
      )}
    </>
  )
}

interface OpcionaisStepProps extends StepProps {
  showCascade?: boolean
}

export function OpcionaisStep({ form, patch, showCascade }: OpcionaisStepProps) {
  return (
    <>
      <span className="help">Tudo aqui é opcional — se não quiser preencher, siga para a revisão.</span>

      <div className="field">
        <label className="label">Observações</label>
        <textarea className="textarea" value={form.notes} onChange={(e) => patch({ notes: e.target.value })} rows={2} />
      </div>

      <div className={`check-row ${form.isBill ? "checked" : ""}`} onClick={() => patch({ isBill: !form.isBill })}>
        <div className={`cb ${form.isBill ? "checked" : ""}`}>{form.isBill && <Icon name="check" className="text-[12px]" />}</div>
        <div>
          <div className="cb-label">Aparece nos vencimentos</div>
          <div className="cb-help">Mostra na tela de Vencimentos para controle de pagamento</div>
        </div>
      </div>

      {showCascade && (
        <div className={`check-row ${form.editCascade ? "checked" : ""}`} onClick={() => patch({ editCascade: !form.editCascade })}>
          <div className={`cb ${form.editCascade ? "checked" : ""}`}>{form.editCascade && <Icon name="check" className="text-[12px]" />}</div>
          <div>
            <div className="cb-label">Aplicar a todas as parcelas</div>
            <div className="cb-help">Altera valor, descrição e categoria em todas</div>
          </div>
        </div>
      )}
    </>
  )
}

interface RevisaoStepProps extends StepProps {
  cards: Card[]
  banks: Bank[]
  categories: Category[]
  onGoTo: (step: number) => void
}

export function RevisaoStep({ form, cards, banks, categories, onGoTo }: RevisaoStepProps) {
  const card = cards.find((c) => c.id === form.cardId)
  const bank = card ? banks.find((b) => b.id === card.bank_id) : null
  const category = categories.find((c) => c.id === form.categoryId)
  const isOther = isOtherCategory(form)
  const missing = missingRequired(form)

  const extras: string[] = []
  if (form.notes.trim()) extras.push("observação")
  if (form.isBill) extras.push("nos vencimentos")

  const rows = [
    {
      label: form.type === "EXPENSE" ? "DESPESA" : "RECEITA",
      value: form.amount ? `R$ ${form.amount}` : "",
      empty: "informar valor",
      step: 0,
    },
    { label: "DESCRIÇÃO", value: form.description, empty: "sem descrição", step: 0 },
    { label: "PAGAR COM", value: card ? `${card.name} · ${bank?.name ?? ""}` : "", empty: "escolher origem", step: 1 },
    {
      label: "CATEGORIA",
      value: isOther ? form.customCategoryName : category?.name ?? "",
      empty: "escolher categoria",
      step: 2,
    },
    { label: "MÊS / LANÇAMENTO", value: `${competenceLabel(form.competence)} · ${launchTypeLabel(form)}`, empty: "", step: 3 },
    { label: "OPCIONAIS", value: extras.join(" · "), empty: "nada preenchido", step: 4 },
  ]

  return (
    <>
      {missing.length > 0 && <span className="help">falta {missing.join(", ")}</span>}
      <div className="wiz-review">
        {rows.map((r) => (
          <button key={r.label} type="button" className="wiz-review-row" onClick={() => onGoTo(r.step)}>
            <div className="wiz-review-main">
              <div className="wiz-review-label">{r.label}</div>
              <div className={`wiz-review-value ${r.value ? "" : "is-empty"}`}>{r.value || r.empty}</div>
            </div>
            <div className="wiz-review-edit">editar</div>
          </button>
        ))}
      </div>
    </>
  )
}
