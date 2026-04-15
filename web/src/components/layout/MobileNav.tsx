import { NavLink } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", icon: "home", label: "Inicio" },
  { to: "/transactions", icon: "receipt_long", label: "Transacoes" },
  { to: "/cards", icon: "credit_card", label: "Cartoes" },
  { to: "/accounts", icon: "account_balance", label: "Contas" },
  { to: "/bills", icon: "payments", label: "Vencimentos" },
  { to: "/reports", icon: "bar_chart", label: "Relatorios" },
  { to: "/settings", icon: "settings", label: "Config" },
]

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1 pb-[env(safe-area-inset-bottom,8px)] pt-1.5 bg-surface-container-low/90 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.3)] border-t border-outline-variant/15">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 min-w-[44px] active:scale-90 transition-all duration-200",
              isActive
                ? "text-primary"
                : "text-on-surface-variant opacity-50"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} filled={isActive} className="text-xl" />
              <span className="text-[8px] font-medium leading-none">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
