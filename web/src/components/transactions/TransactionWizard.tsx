import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Dialog } from "@/components/ui/Dialog"
import { toast } from "@/components/ui/Toast"
import { useFinanceStore } from "@/stores/finance-store"
import { baseDescription } from "@/lib/transaction-format"
import {
  WIZARD_STEPS,
  buildAddTransactionPayload,
  emptyWizardForm,
  isStepValid,
  missingRequired,
  type WizardForm,
} from "./wizard-model"
import { CategoriaStep, OpcionaisStep, PagamentoStep, QuandoStep, RevisaoStep, ValorStep } from "./wizard-steps"

interface TransactionWizardProps {
  defaultMonth: string
  onClose: () => void
  onCreated: () => void
}

export function TransactionWizard({ defaultMonth, onClose, onCreated }: TransactionWizardProps) {
  const { cards, banks, categories, transactions, addTransaction } = useFinanceStore()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardForm>(() => emptyWizardForm(defaultMonth))
  const [submitting, setSubmitting] = useState(false)
  const stepRef = useRef<HTMLFormElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  const patch = useCallback((p: Partial<WizardForm>) => setForm((f) => ({ ...f, ...p })), [])

  useEffect(() => {
    if (stepRef.current) stepRef.current.scrollTop = 0
    const current = railRef.current?.querySelector(".wiz-rail-item.is-current")
    if (current) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      current.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" })
    }
  }, [step])

  const autoCategoryRef = useRef<string | null>(null)
  useEffect(() => {
    const desc = form.description.trim().toLowerCase()
    if (!desc) return
    if (form.categoryId && form.categoryId !== autoCategoryRef.current) return
    const match = transactions.find((t) => baseDescription(t.description).trim().toLowerCase() === desc && t.category_id)
    if (match && match.category_id && match.category_id !== form.categoryId) {
      patch({ categoryId: match.category_id })
      autoCategoryRef.current = match.category_id
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description, transactions])

  const isLast = step === WIZARD_STEPS.length - 1
  const valid = isStepValid(form, step)
  const missing = missingRequired(form)
  const footerHint = valid ? "" : isLast ? `falta ${missing.join(", ")}` : "preencha os campos obrigatórios"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    if (!isLast) {
      setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      await toast.run("Criando transação...", () => addTransaction(buildAddTransactionPayload(form)), "Transação criada")
      onCreated()
    } catch {
      // erro já reportado via toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      className="modal-wizard"
      bodyClassName="modal-body-flush"
      footerClassName="wiz-foot"
      title={
        <div className="wiz-title">
          <span>Nova transação</span>
          <span className="wiz-title-sub">Etapa {step + 1} de {WIZARD_STEPS.length} · {WIZARD_STEPS[step].label}</span>
        </div>
      }
      footer={
        <>
          {step > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Voltar
            </button>
          )}
          <span className="wiz-foot-hint">{footerHint}</span>
          <button type="submit" form="tx-wizard" className="btn btn-primary" disabled={!valid || submitting}>
            {submitting && <span className="spinner" />}
            {isLast ? "Criar transação" : "Continuar"}
          </button>
        </>
      }
    >
      <div className="wiz-rail" ref={railRef}>
        <div className="wiz-rail-list">
          {WIZARD_STEPS.map((s, i) => {
            const isCurrent = i === step
            const isDone = !isCurrent && i < WIZARD_STEPS.length - 1 && isStepValid(form, i)
            return (
              <button
                key={s.id}
                type="button"
                className={`wiz-rail-item ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}
                onClick={() => setStep(i)}
              >
                <span className="wiz-dot">{isDone ? <Icon name="check" className="text-[13px]" /> : i + 1}</span>
                <span className="wiz-rail-label">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <form id="tx-wizard" ref={stepRef} className="wiz-step" onSubmit={handleSubmit}>
        {step === 0 && <ValorStep form={form} patch={patch} />}
        {step === 1 && <PagamentoStep form={form} patch={patch} cards={cards} banks={banks} />}
        {step === 2 && <CategoriaStep form={form} patch={patch} categories={categories} />}
        {step === 3 && <QuandoStep form={form} patch={patch} />}
        {step === 4 && <OpcionaisStep form={form} patch={patch} />}
        {step === 5 && (
          <RevisaoStep form={form} patch={patch} cards={cards} banks={banks} categories={categories} onGoTo={setStep} />
        )}
      </form>
    </Dialog>
  )
}
