import { Icon } from "@/components/ui/Icon"
import { usePwaUpdate } from "@/hooks/usePwaUpdate"

export function UpdatePrompt() {
  const { needRefresh, updateApp, dismiss } = usePwaUpdate()

  if (!needRefresh) return null

  return (
    <div className="pwa-banner">
      <Icon name="sync" className="pwa-banner-icon" />
      <span>Nova versão disponível</span>
      <div className="pwa-banner-actions">
        <button type="button" className="btn btn-ghost" onClick={dismiss}>
          Depois
        </button>
        <button type="button" className="btn btn-primary" onClick={updateApp}>
          Atualizar
        </button>
      </div>
    </div>
  )
}
