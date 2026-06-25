import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import localforage from "localforage";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MonthProvider } from "@/contexts/MonthContext";
import { TransactionModalProvider } from "@/contexts/TransactionModalContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout";
import { PinWrapper } from "@/components/auth/PinWrapper";
import { ThemeProvider } from "@/components/ui/theme-provider";
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


// Páginas secundárias — carregadas sob demanda (lazy) para reduzir bundle inicial
const SharedExpenses = lazy(() => import("./pages/SharedExpenses").then(m => ({ default: m.SharedExpenses })));
const Trips = lazy(() => import("./pages/Trips").then(m => ({ default: m.Trips })));
const CreditCards = lazy(() => import("./pages/CreditCards").then(m => ({ default: m.CreditCards })));
const Reports = lazy(() => import("./pages/Reports").then(m => ({ default: m.Reports })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Family = lazy(() => import("./pages/Family").then(m => ({ default: m.Family })));
const Budgets = lazy(() => import("./pages/Budgets").then(m => ({ default: m.Budgets })));
const GoalsAndInvestments = lazy(() => import("./pages/GoalsAndInvestments").then(m => ({ default: m.GoalsAndInvestments })));
const Calculators = lazy(() => import("./pages/Calculators").then(m => ({ default: m.Calculators })));

import { Skeleton } from "@/components/ui/skeleton";

// Fallback de carregamento para Suspense (Premium Skeleton Loader)
function PageLoader() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="h-[400px] w-full rounded-xl col-span-4" />
        <Skeleton className="h-[400px] w-full rounded-xl col-span-3" />
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos mantendo dados locais "frescos"
      gcTime: 1000 * 60 * 60 * 24, // 24 horas em memória cache persistente
      refetchOnWindowFocus: false, // Menos agressivo ao focar a aba
    },
  },
});

localforage.config({
  name: 'SeuBolsoInteligente',
  storeName: 'reactQueryCache',
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: localforage,
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <PersistQueryClientProvider 
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 }} // 24 horas
    >
      <ErrorBoundary>
        <AuthProvider>
          <MonthProvider>
          <TransactionModalProvider>
            <PrivacyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />

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
                    path="/cartoes/:id"
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
                    path="/simuladores"
                    element={
                      <ProtectedRoute>
                        <PinWrapper>
                          <AppLayout>
                            <Suspense fallback={<PageLoader />}>
                              <Calculators />
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
    </PersistQueryClientProvider>
  </ThemeProvider>
);

export default App;
