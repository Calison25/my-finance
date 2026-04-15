import { create } from "zustand"
import type { Session, User as SupabaseUser } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { useFinanceStore } from "@/stores/finance-store"

interface AppUser {
  id: string
  household_id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: "owner" | "member"
}

interface Household {
  id: string
  name: string
}

interface AuthState {
  supabaseUser: SupabaseUser | null
  session: Session | null
  appUser: AppUser | null
  household: Household | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  supabaseUser: null,
  session: null,
  appUser: null,
  household: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  signInWithGoogle: async () => {
    set({ error: null, isLoading: true })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    useFinanceStore.getState().reset()
    set({
      supabaseUser: null,
      session: null,
      appUser: null,
      household: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        set({ session, supabaseUser: session.user })
        await provisionUser(session.access_token, set)
      } else {
        set({ isLoading: false })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        set({ session, supabaseUser: session.user })
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await provisionUser(session.access_token, set)
        }
      } else {
        set({
          supabaseUser: null,
          session: null,
          appUser: null,
          household: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    })

    return () => subscription.unsubscribe()
  },
}))

async function provisionUser(
  accessToken: string,
  set: (state: Partial<AuthState>) => void,
) {
  try {
    const res = await fetch("/api/auth/me", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      throw new Error(`Provisioning failed: ${res.status}`)
    }

    const data = await res.json()
    set({
      appUser: data.user,
      household: data.household,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    })
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : "Erro ao provisionar usuario",
      isAuthenticated: false,
      isLoading: false,
    })
  }
}
