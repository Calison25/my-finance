import { NavLink } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"

const navItems = [
  { to: "/", icon: "dashboard", label: "Início" },
  { to: "/accounts", icon: "account_balance_wallet", label: "Contas" },
  { to: "/cards", icon: "credit_card", label: "Cartões" },
  { to: "/transactions", icon: "receipt_long", label: "Trans." },
  { to: "/bills", icon: "payments", label: "Venc." },
  { to: "/reports", icon: "bar_chart", label: "Relat." },
  { to: "/settings", icon: "settings", label: "Config" },
]

export function MobileNav() {
  return (
    <nav className="mobile-tabbar">
      <div className="mobile-tabbar-inner">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `tab-item ${isActive ? "active" : ""}`}
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} filled={isActive} className="text-[18px]" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
