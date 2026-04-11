import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MobileNav } from "@/components/layout/MobileNav"
import { Dashboard } from "@/pages/Dashboard"
import { Accounts } from "@/pages/Accounts"
import { Cards } from "@/pages/Cards"
import { Transactions } from "@/pages/Transactions"
import { Reports } from "@/pages/Reports"
import { Login } from "@/pages/Login"
import { useFinanceStore } from "@/stores/finance-store"

const queryClient = new QueryClient()

function AppLayout({ children }: { children: React.ReactNode }) {
  const { fetchAll, isLoading } = useFinanceStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-body flex items-center justify-center">
        <p className="text-muted text-lg">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <Header />
      <Sidebar />
      <main className="max-w-7xl mx-auto px-6 pb-32 pt-4 md:ml-24">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/accounts" element={<AppLayout><Accounts /></AppLayout>} />
          <Route path="/cards" element={<AppLayout><Cards /></AppLayout>} />
          <Route path="/transactions" element={<AppLayout><Transactions /></AppLayout>} />
          <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
