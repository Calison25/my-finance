import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"
import { useAuthStore } from "@/stores/auth-store"

export function Login() {
  const navigate = useNavigate()
  const { signInWithGoogle, isAuthenticated, isLoading, error } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex items-center justify-center p-4">
      {/* Atmospheric background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[5%] right-[5%] w-[30%] h-[30%] rounded-full bg-tertiary/5 blur-[100px]" />
      </div>

      <main className="relative w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden rounded-xl bg-surface-container-low shadow-[0_24px_48px_rgba(0,0,0,0.5)]">
        {/* Left Side: Branding */}
        <section className="hidden md:flex md:col-span-5 relative flex-col justify-between p-12 bg-surface-container-high overflow-hidden">
          <div className="z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(170,199,255,0.3)]">
                <Icon name="account_balance" className="text-on-primary text-2xl" filled />
              </div>
              <span className="font-headline font-extrabold text-2xl tracking-tighter text-primary">
                My Finance
              </span>
            </div>
            <h1 className="font-headline text-4xl font-extrabold leading-tight mb-6 text-on-surface">
              Controle suas <br />
              <span className="text-primary-fixed-dim">financas pessoais</span>
            </h1>
            <p className="text-on-surface-variant leading-relaxed text-lg max-w-xs">
              Gerencie seus gastos, receitas e cartoes com clareza e precisao.
            </p>
          </div>

          <div className="relative z-10 mt-auto">
            <div className="glass-card p-6 rounded-xl ghost-border">
              <p className="italic text-on-surface-variant font-medium">
                "Simplicidade e controle total das minhas financas em um so lugar."
              </p>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/40 to-transparent" />
          </div>
        </section>

        {/* Right Side: Login */}
        <section className="col-span-1 md:col-span-7 p-8 md:p-16 flex flex-col justify-center bg-surface">
          {/* Mobile Brand */}
          <div className="flex md:hidden items-center gap-2 mb-10">
            <Icon name="account_balance" className="text-primary text-3xl" filled />
            <span className="font-headline font-bold text-xl tracking-tight text-primary">
              My Finance
            </span>
          </div>

          <div className="max-w-md w-full mx-auto">
            <header className="mb-10">
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">
                Acesso Seguro
              </h2>
              <p className="text-on-surface-variant">
                Entre com sua conta Google para acessar suas financas.
              </p>
            </header>

            <div className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-error-container/20 border border-error/20">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl font-headline font-bold text-on-surface bg-surface-container-highest hover:bg-surface-container-high transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 ghost-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Entrar com Google
                  </>
                )}
              </button>
            </div>

            <p className="mt-8 text-center text-xs text-on-surface-variant">
              Ao entrar, voce concorda com nossos termos de uso.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
