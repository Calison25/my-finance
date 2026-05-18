import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MobileNav } from "@/components/layout/MobileNav"
import { ToastHost } from "@/components/ui/Toast"
import { Dashboard } from "@/pages/Dashboard"
import { Accounts } from "@/pages/Accounts"
import { Cards } from "@/pages/Cards"
import { Transactions } from "@/pages/Transactions"
import { Reports } from "@/pages/Reports"
import { Bills } from "@/pages/Bills"
import { Login } from "@/pages/Login"
import { Settings } from "@/pages/Settings"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useFinanceStore } from "@/stores/finance-store"
import { useAuthStore } from "@/stores/auth-store"

const queryClient = new QueryClient()

function AppLayout({ children }: { children: React.ReactNode }) {
  const { fetchAll, isLoading } = useFinanceStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (isLoading) {
    return (
      <div className="app" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-3)", fontSize: 14 }}>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="app-main">
        <Header />
        {children}
      </div>
      <MobileNav />
    </div>
  )
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><AppLayout><Accounts /></AppLayout></ProtectedRoute>} />
            <Route path="/cards" element={<ProtectedRoute><AppLayout><Cards /></AppLayout></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><AppLayout><Transactions /></AppLayout></ProtectedRoute>} />
            <Route path="/bills" element={<ProtectedRoute><AppLayout><Bills /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          </Routes>
          <ToastHost />
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
