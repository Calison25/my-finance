import { NavLink } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"

const navItems = [
  { to: "/", icon: "dashboard", label: "Dashboard" },
  { to: "/accounts", icon: "account_balance_wallet", label: "Contas" },
  { to: "/cards", icon: "credit_card", label: "Cartões" },
  { to: "/transactions", icon: "receipt_long", label: "Transações" },
  { to: "/bills", icon: "payments", label: "Vencimentos" },
  { to: "/reports", icon: "bar_chart", label: "Relatórios" },
  { to: "/settings", icon: "settings", label: "Configurações" },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <Icon name="account_balance" className="text-base" />
        </div>
        <span className="brand-name">My Finance</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            {({ isActive }) => (
              <>
                <span className="nav-icon">
                  <Icon name={item.icon} filled={isActive} className="text-[20px]" />
                </span>
                <span className="nav-label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
