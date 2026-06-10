import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MonthProvider } from "@/contexts/MonthContext";
import { TransactionModalProvider } from "@/contexts/TransactionModalContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout";
import { PinWrapper } from "@/components/auth/PinWrapper";
import { lazy, Suspense } from "react";

// Páginas críticas — carregadas imediatamente (impacto direto no primeiro acesso)
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Accounts } from "./pages/Accounts";
import { AccountDetail } from "./pages/AccountDetail";
import { Auth } from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PWAUpdater } from "./components/PWAUpdater";

// Páginas secundárias — carregadas sob demanda (lazy) para reduzir bundle inicial
const SharedExpenses = lazy(() => import("./pages/SharedExpenses").then(m => ({ default: m.SharedExpenses })));
const Trips = lazy(() => import("./pages/Trips").then(m => ({ default: m.Trips })));
const CreditCards = lazy(() => import("./pages/CreditCards").then(m => ({ default: m.CreditCards })));
const Reports = lazy(() => import("./pages/Reports").then(m => ({ default: m.Reports })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Family = lazy(() => import("./pages/Family").then(m => ({ default: m.Family })));
const Budgets = lazy(() => import("./pages/Budgets").then(m => ({ default: m.Budgets })));
const GoalsAndInvestments = lazy(() => import("./pages/GoalsAndInvestments").then(m => ({ default: m.GoalsAndInvestments })));

// Fallback de carregamento para Suspense
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos mantendo dados locais "frescos"
      gcTime: 1000 * 60 * 10, // 10 minutos em memória cache
      refetchOnWindowFocus: false, // Menos agressivo ao focar a aba
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <MonthProvider>
          <TransactionModalProvider>
            <PrivacyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAUpdater />
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Dashboard />
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/transacoes"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Transactions />
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/contas"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Accounts />
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/contas/:id"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <AccountDetail />
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cartoes"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <CreditCards />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/compartilhados"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <SharedExpenses />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/viagens"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <Trips />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/familia"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <Family />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/relatorios"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <Reports />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orcamentos"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <Budgets />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/metas"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <GoalsAndInvestments />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/configuracoes"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <Settings />
                            </Suspense>
                          </AppLayout>
                        </PinWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
            </PrivacyProvider>
          </TransactionModalProvider>
        </MonthProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
