import { useNavigate } from "react-router-dom"
import { Icon } from "@/components/ui/Icon"

export function Login() {
  const navigate = useNavigate()

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

        {/* Right Side: Login Form */}
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
                Entre com suas credenciais para acessar sua conta.
              </p>
            </header>

            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                navigate("/")
              }}
            >
              <div className="space-y-2">
                <label
                  className="block font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant/80"
                  htmlFor="email"
                >
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon
                      name="mail"
                      className="text-on-surface-variant text-xl group-focus-within:text-primary transition-colors"
                    />
                  </div>
                  <input
                    className="block w-full pl-12 pr-4 py-4 bg-surface-container-highest border-none rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                    id="email"
                    type="email"
                    placeholder="nome@email.com"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    className="block font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant/80"
                    htmlFor="password"
                  >
                    Senha
                  </label>
                  <a className="text-xs font-semibold text-primary hover:text-primary-fixed-dim transition-colors" href="#">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon
                      name="lock"
                      className="text-on-surface-variant text-xl group-focus-within:text-primary transition-colors"
                    />
                  </div>
                  <input
                    className="block w-full pl-12 pr-12 py-4 bg-surface-container-highest border-none rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                    id="password"
                    type="password"
                    placeholder="********"
                    disabled
                  />
                  <button className="absolute inset-y-0 right-0 pr-4 flex items-center" type="button">
                    <Icon name="visibility" className="text-on-surface-variant hover:text-on-surface transition-colors" />
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  className="w-5 h-5 rounded border-none bg-surface-container-highest text-primary focus:ring-primary/30 focus:ring-offset-0"
                  id="remember"
                  type="checkbox"
                />
                <label className="ml-3 text-sm text-on-surface-variant" htmlFor="remember">
                  Manter conectado por 30 dias
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-4 px-6 rounded-xl font-headline font-bold text-on-primary bg-gradient-to-br from-primary to-primary-container shadow-[0_10px_20px_rgba(0,102,204,0.3)] hover:shadow-[0_15px_30px_rgba(0,102,204,0.4)] hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
              >
                Entrar
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-on-surface-variant">
              Autenticacao sera implementada futuramente
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
