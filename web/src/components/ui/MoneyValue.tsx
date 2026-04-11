import { useFinanceStore } from "@/stores/finance-store"

interface Props {
  value: number
  className?: string
}

export function MoneyValue({ value, className = "" }: Props) {
  const { valuesVisible } = useFinanceStore()
  const formatted = value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  return (
    <span className={className}>
      {valuesVisible ? formatted : "R$ ••••••"}
    </span>
  )
}
