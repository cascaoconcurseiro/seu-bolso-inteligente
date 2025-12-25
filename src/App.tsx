import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { NewTransaction } from "./pages/NewTransaction";
import { SharedExpenses } from "./pages/SharedExpenses";
import { Trips } from "./pages/Trips";
import { CreditCards } from "./pages/CreditCards";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Family } from "./pages/Family";
import { Accounts } from "./pages/Accounts";
import { Auth } from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transacoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Transactions />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transacoes/nova"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <NewTransaction />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contas"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Accounts />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cartoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CreditCards />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/compartilhados"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SharedExpenses />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/viagens"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Trips />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/familia"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Family />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
