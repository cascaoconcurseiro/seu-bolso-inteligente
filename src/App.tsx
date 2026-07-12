import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EdgeSwipeBack } from "@/components/pwa/EdgeSwipeBack";
import { IOSInstallPrompt } from "@/components/pwa/IOSInstallPrompt";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Auth } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Privacidade from "./pages/Privacidade";
import ResetPassword from "./pages/ResetPassword";

const PrivateAppShell = lazy(() =>
  import("@/components/app/PrivateAppShell").then((module) => ({
    default: module.PrivateAppShell,
  }))
);
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Transactions = lazy(() =>
  import("./pages/Transactions").then((m) => ({ default: m.Transactions }))
);
const Accounts = lazy(() => import("./pages/Accounts").then((m) => ({ default: m.Accounts })));
const AccountDetail = lazy(() =>
  import("./pages/AccountDetail").then((m) => ({ default: m.AccountDetail }))
);
const SharedExpenses = lazy(() =>
  import("./pages/SharedExpenses").then((m) => ({ default: m.SharedExpenses }))
);
const Trips = lazy(() => import("./pages/Trips").then((m) => ({ default: m.Trips })));
const CreditCards = lazy(() =>
  import("./pages/CreditCards").then((m) => ({ default: m.CreditCards }))
);
const Reports = lazy(() => import("./pages/Reports").then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Family = lazy(() => import("./pages/Family").then((m) => ({ default: m.Family })));
const Budgets = lazy(() => import("./pages/Budgets").then((m) => ({ default: m.Budgets })));
const GoalsAndInvestments = lazy(() =>
  import("./pages/GoalsAndInvestments").then((m) => ({ default: m.GoalsAndInvestments }))
);
const Calculators = lazy(() =>
  import("./pages/Calculators").then((m) => ({ default: m.Calculators }))
);

function PageLoader() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-[400px] w-full rounded-lg" />
        <Skeleton className="col-span-3 h-[400px] w-full rounded-lg" />
      </div>
    </div>
  );
}

function DeferredPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <ErrorBoundary>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <ActionFeedback />
          <BrowserRouter>
            <IOSInstallPrompt />
            <EdgeSwipeBack />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacidade" element={<Privacidade />} />

              <Route
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PrivateAppShell />
                  </Suspense>
                }
              >
                <Route
                  path="/"
                  element={
                    <DeferredPage>
                      <Dashboard />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/transacoes"
                  element={
                    <DeferredPage>
                      <Transactions />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/contas"
                  element={
                    <DeferredPage>
                      <Accounts />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/contas/:id"
                  element={
                    <DeferredPage>
                      <AccountDetail />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/cartoes"
                  element={
                    <DeferredPage>
                      <CreditCards />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/cartoes/:id"
                  element={
                    <DeferredPage>
                      <CreditCards />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/compartilhados"
                  element={
                    <DeferredPage>
                      <SharedExpenses />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/viagens"
                  element={
                    <DeferredPage>
                      <Trips />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/familia"
                  element={
                    <DeferredPage>
                      <Family />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/relatorios"
                  element={
                    <DeferredPage>
                      <Reports />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/orcamentos"
                  element={
                    <DeferredPage>
                      <Budgets />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/metas"
                  element={
                    <DeferredPage>
                      <GoalsAndInvestments />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/simuladores"
                  element={
                    <DeferredPage>
                      <Calculators />
                    </DeferredPage>
                  }
                />
                <Route
                  path="/configuracoes"
                  element={
                    <DeferredPage>
                      <Settings />
                    </DeferredPage>
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
