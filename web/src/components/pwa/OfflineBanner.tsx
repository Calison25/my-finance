import { Icon } from "@/components/ui/Icon"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div className="offline-banner">
      <Icon name="wifi_off" className="offline-banner-icon" />
      <span>Sem conexão — os dados podem estar desatualizados.</span>
    </div>
  )
}
