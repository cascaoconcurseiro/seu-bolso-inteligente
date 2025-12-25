import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { NewTransaction } from "./pages/NewTransaction";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transacoes" element={<Transactions />} />
            <Route path="/transacoes/nova" element={<NewTransaction />} />
            {/* Rotas placeholder para outras seções */}
            <Route path="/cartoes" element={<PlaceholderPage title="Cartões" />} />
            <Route path="/compartilhados" element={<PlaceholderPage title="Compartilhados" />} />
            <Route path="/viagens" element={<PlaceholderPage title="Viagens" />} />
            <Route path="/relatorios" element={<PlaceholderPage title="Relatórios" />} />
            <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Componente placeholder para páginas ainda não implementadas
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="font-display font-semibold text-2xl text-foreground mb-2">
        {title}
      </h1>
      <p className="text-muted-foreground">
        Esta seção será implementada na próxima fase.
      </p>
    </div>
  );
}

export default App;