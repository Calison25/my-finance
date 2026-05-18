import { create } from "zustand"

type Theme = "light" | "dark"

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "mf-theme"

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark")
  } else {
    document.documentElement.removeAttribute("data-theme")
  }
}

function readInitial(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t === "dark" || t === "light") return t
  } catch {}
  return "dark"
}

const initial: Theme = readInitial()
applyTheme(initial)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === "light" ? "dark" : "light"
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {}
      applyTheme(next)
      return { theme: next }
    }),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
    applyTheme(theme)
    set({ theme })
  },
}))
