import { useRegisterSW } from "virtual:pwa-register/react"

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    },
  })

  function dismiss() {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return {
    needRefresh,
    offlineReady,
    updateApp: () => updateServiceWorker(true),
    dismiss,
  }
}
