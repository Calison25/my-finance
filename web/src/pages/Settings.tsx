import { useState, useEffect } from "react"
import { Icon } from "@/components/ui/Icon"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/services/api"
import type { Member, HouseholdInvite } from "@/types"

export function Settings() {
  const { appUser, household, signOut } = useAuthStore()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<HouseholdInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const isOwner = appUser?.role === "owner"

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [m, i] = await Promise.all([
        api.household.listMembers(),
        api.household.listInvites(),
      ])
      setMembers(m)
      setInvites(i.filter((inv) => inv.status === "pending"))
    } catch {
      // silently fail on load
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setLoading(true)
    setMessage(null)
    try {
      await api.household.invite(inviteEmail.trim())
      setMessage({ type: "success", text: "Convite enviado com sucesso!" })
      setInviteEmail("")
      await loadData()
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao enviar convite",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await api.household.removeMember(userId)
      await loadData()
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao remover membro",
      })
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      await api.household.cancelInvite(inviteId)
      await loadData()
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-headline text-2xl font-bold">Configuracoes</h1>

      {/* Profile Section */}
      <section className="glass-card ghost-border rounded-2xl p-6 space-y-4">
        <h2 className="font-headline text-lg font-bold flex items-center gap-2">
          <Icon name="person" className="text-primary" />
          Perfil
        </h2>
        <div className="flex items-center gap-4">
          {appUser?.avatar_url ? (
            <img
              src={appUser.avatar_url}
              alt={appUser.name ?? "Avatar"}
              className="w-14 h-14 rounded-full ghost-border"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
              <Icon name="person" className="text-on-primary-container text-2xl" />
            </div>
          )}
          <div>
            <p className="font-bold text-on-surface">{appUser?.name ?? "Usuario"}</p>
            <p className="text-sm text-on-surface-variant">{appUser?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-container/30 text-primary">
              {appUser?.role === "owner" ? "Dono" : "Membro"}
            </span>
          </div>
        </div>
      </section>

      {/* Household Section */}
      <section className="glass-card ghost-border rounded-2xl p-6 space-y-4">
        <h2 className="font-headline text-lg font-bold flex items-center gap-2">
          <Icon name="group" className="text-primary" />
          Conta Familia
          <span className="text-sm font-normal text-on-surface-variant">
            — {household?.name}
          </span>
        </h2>

        {/* Members */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/80">
            Membros
          </p>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-highest/50"
              >
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.name ?? ""}
                    className="w-9 h-9 rounded-full"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
                    <Icon name="person" className="text-on-surface-variant text-sm" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.name ?? member.email}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{member.email}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {member.role === "owner" ? "Dono" : "Membro"}
                </span>
                {isOwner && member.id !== appUser?.id && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1.5 rounded-lg hover:bg-error-container/20 text-error transition-colors"
                    title="Remover membro"
                  >
                    <Icon name="close" className="text-sm" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/80">
              Convites pendentes
            </p>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-highest/50"
                >
                  <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
                    <Icon name="mail" className="text-on-surface-variant text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{invite.invited_email}</p>
                    <p className="text-[11px] text-on-surface-variant">Pendente</p>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-1.5 rounded-lg hover:bg-error-container/20 text-error transition-colors"
                      title="Cancelar convite"
                    >
                      <Icon name="close" className="text-sm" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Form */}
        {isOwner && (
          <form onSubmit={handleInvite} className="space-y-3 pt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/80">
              Convidar parceiro
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1 px-4 py-3 bg-surface-container-highest border-none rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 text-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50"
              >
                {loading ? "..." : "Convidar"}
              </button>
            </div>
            {message && (
              <p
                className={`text-xs ${message.type === "success" ? "text-green-400" : "text-error"}`}
              >
                {message.text}
              </p>
            )}
          </form>
        )}
      </section>

      {/* Sign Out */}
      <section className="glass-card ghost-border rounded-2xl p-6">
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 text-error hover:text-error/80 font-bold text-sm transition-colors"
        >
          <Icon name="logout" />
          Sair da conta
        </button>
      </section>
    </div>
  )
}
