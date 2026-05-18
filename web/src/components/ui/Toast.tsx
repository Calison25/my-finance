import { useEffect, useState, useSyncExternalStore } from "react"
import { Icon } from "@/components/ui/Icon"

type ToastKind = "loading" | "success" | "error"

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

type Listener = () => void

let _id = 0
let _toasts: Toast[] = []
let _busy = 0
const _listeners = new Set<Listener>()

function emit() {
  for (const l of _listeners) l()
}

function subscribe(listener: Listener) {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

function getSnapshot() {
  return { toasts: _toasts, busy: _busy }
}

let _snapshot = getSnapshot()
function getStableSnapshot() {
  const next = { toasts: _toasts, busy: _busy }
  if (next.toasts === _snapshot.toasts && next.busy === _snapshot.busy) return _snapshot
  _snapshot = next
  return _snapshot
}

function pushToast(t: Toast) {
  _toasts = [..._toasts, t]
  emit()
}

function removeToast(id: number) {
  _toasts = _toasts.filter((t) => t.id !== id)
  emit()
}

function setBusy(delta: number) {
  _busy = Math.max(0, _busy + delta)
  emit()
}

export const toast = {
  success(message: string, opts?: { duration?: number }) {
    const id = ++_id
    pushToast({ id, kind: "success", message })
    setTimeout(() => removeToast(id), opts?.duration ?? 2500)
    return id
  },
  error(message: string, opts?: { duration?: number }) {
    const id = ++_id
    pushToast({ id, kind: "error", message })
    setTimeout(() => removeToast(id), opts?.duration ?? 3500)
    return id
  },
  loading(message: string) {
    const id = ++_id
    pushToast({ id, kind: "loading", message })
    return id
  },
  dismiss(id: number) {
    removeToast(id)
  },
  async run<T>(loadingMsg: string, fn: () => Promise<T>, successMsg?: string): Promise<T> {
    setBusy(1)
    const id = this.loading(loadingMsg)
    try {
      const result = await fn()
      this.dismiss(id)
      if (successMsg) this.success(successMsg)
      return result
    } catch (err) {
      this.dismiss(id)
      const msg = err instanceof Error ? err.message : "Erro ao executar"
      this.error(msg)
      throw err
    } finally {
      setBusy(-1)
    }
  },
}

export function ToastHost() {
  const { toasts, busy } = useSyncExternalStore(subscribe, getStableSnapshot, getStableSnapshot)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null

  return (
    <>
      <div className={`progress-bar ${busy > 0 ? "active" : ""}`} />
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === "loading" && <span className="spinner" />}
            {t.kind === "success" && <Icon name="check_circle" className="toast-icon" filled />}
            {t.kind === "error" && <Icon name="error" className="toast-icon" filled />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  )
}
