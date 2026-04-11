import { NavLink } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", icon: "home", label: "Inicio" },
  { to: "/cards", icon: "credit_card", label: "Cartoes" },
  { to: "/transactions", icon: "add_circle", label: "Novo" },
  { to: "/accounts", icon: "account_balance", label: "Contas" },
  { to: "/reports", icon: "bar_chart", label: "Relatorios" },
]

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-surface-container-low/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.3)] border-t border-outline-variant/15">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center p-3 active:scale-90 transition-all duration-200",
              isActive
                ? "bg-surface-container-highest text-primary rounded-xl shadow-[0_0_15px_rgba(0,102,204,0.2)]"
                : "text-on-surface-variant opacity-60 hover:bg-surface-container-high hover:opacity-100"
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
