import { Icon } from "@/components/ui/Icon"

export function Header() {
  return (
    <header className="bg-surface sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full overflow-hidden ghost-border bg-surface-container-high flex items-center justify-center">
            <Icon name="account_balance" className="text-primary text-xl" filled />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary font-headline">
            My Finance
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors duration-300 rounded-full active:scale-95">
            <Icon name="notifications" />
          </button>
        </div>
      </div>
    </header>
  )
}
