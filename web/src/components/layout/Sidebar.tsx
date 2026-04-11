import { NavLink } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", icon: "dashboard", label: "Dashboard" },
  { to: "/accounts", icon: "account_balance_wallet", label: "Contas" },
  { to: "/cards", icon: "credit_card", label: "Cartoes" },
  { to: "/transactions", icon: "receipt_long", label: "Transacoes" },
  { to: "/bills", icon: "payments", label: "Vencimentos" },
  { to: "/reports", icon: "bar_chart", label: "Relatorios" },
]

export function Sidebar() {
  return (
    <nav className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 flex-col gap-6 z-40 bg-surface-container-low/50 backdrop-blur-md p-3 rounded-full ghost-border shadow-xl">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.label}
          className={({ isActive }) =>
            cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200",
              isActive
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "text-on-surface-variant hover:bg-surface-container-highest"
            )
          }
        >
          {({ isActive }) => (
            <Icon name={item.icon} filled={isActive} />
          )}
        </NavLink>
      ))}
    </nav>
  )
}
