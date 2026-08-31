import { Icon } from "@/components/ui/Icon"
import { useInstallPrompt } from "@/hooks/useInstallPrompt"

export function InstallPrompt() {
  const { canInstall, isInstalled, isIos, promptInstall } = useInstallPrompt()

  return (
    <section className="glass-card ghost-border rounded-2xl p-6 space-y-4">
      <h2 className="font-headline text-lg font-bold flex items-center gap-2">
        <Icon name="install_mobile" className="text-primary" />
        Aplicativo
      </h2>

      {isInstalled && (
        <p className="text-sm text-on-surface-variant flex items-center gap-2">
          <Icon name="check_circle" filled className="text-positive text-base" />
          Instalado neste dispositivo
        </p>
      )}

      {!isInstalled && canInstall && (
        <div className="space-y-2">
          <p className="text-sm text-on-surface-variant">
            Instale o My Finance como aplicativo para acesso rápido, tela cheia e uso offline do essencial.
          </p>
          <button
            type="button"
            onClick={promptInstall}
            className="px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 transition-opacity active:scale-95"
          >
            Instalar aplicativo
          </button>
        </div>
      )}

      {!isInstalled && !canInstall && isIos && (
        <p className="text-sm text-on-surface-variant">
          No Safari, toque em <strong>Compartilhar</strong> e depois em{" "}
          <strong>Adicionar à Tela de Início</strong> para instalar o app.
        </p>
      )}

      {!isInstalled && !canInstall && !isIos && (
        <p className="text-sm text-on-surface-variant">
          A opção de instalar aparece aqui assim que o navegador permitir.
        </p>
      )}
    </section>
  )
}
