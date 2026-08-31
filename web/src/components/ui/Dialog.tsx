import { useEffect, type ReactNode } from "react"
import { Icon } from "./Icon"

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
  footerClassName?: string
}

export function Dialog({ open, onClose, title, children, footer, className, bodyClassName, footerClassName }: DialogProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${className ?? ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
        <div className={`modal-body ${bodyClassName ?? ""}`}>{children}</div>
        {footer && <div className={`modal-foot ${footerClassName ?? ""}`}>{footer}</div>}
      </div>
    </div>
  )
}
