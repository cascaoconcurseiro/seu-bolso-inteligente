import { BalanceCard, CurrencyDisplay, TransactionItem } from "@/components/financial";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  AlertCircle,
  TrendingUp,
  CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";

// Dados mock para demonstração
const mockTransactions = [
  {
    id: "1",
    description: "Supermercado Extra",
    value: 342.50,
    type: "expense" as const,
    category: "alimentacao" as const,
    date: new Date(2025, 11, 23),
  },
  {
    id: "2",
    description: "Salário",
    value: 8500,
    type: "income" as const,
    category: "outros" as const,
    date: new Date(2025, 11, 20),
  },
  {
    id: "3",
    description: "Parcela TV Samsung",
    value: 299.90,
    type: "expense" as const,
    category: "lazer" as const,
    date: new Date(2025, 11, 18),
    installment: { current: 3, total: 12 },
  },
  {
    id: "4",
    description: "Conta de Luz",
    value: 187.30,
    type: "expense" as const,
    category: "moradia" as const,
    date: new Date(2025, 11, 15),
    isShared: true,
    sharedWith: ["Ana", "Carlos"],
  },
];

const alerts = [
  {
    id: "1",
    type: "warning" as const,
    message: "Fatura do Nubank vence em 3 dias",
    value: 2340.50,
  },
  {
    id: "2",
    type: "danger" as const,
    message: "Despesas acima do planejado este mês",
    value: 450.00,
  },
];

export function Dashboard() {
  const currentMonth = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-foreground">
            Visão Geral
          </h1>
          <p className="text-muted-foreground mt-1 capitalize">{currentMonth}</p>
        </div>
        <Link to="/transacoes/nova">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nova Movimentação
          </Button>
        </Link>
      </header>

      {/* Cards de Resumo */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          title="Saldo Atual"
          value={12450.80}
          trend={5.2}
          trendLabel="vs mês passado"
          variant="primary"
        />
        <BalanceCard
          title="Entradas"
          value={15800.00}
          className="card-status-success"
        />
        <BalanceCard
          title="Saídas"
          value={3349.20}
          className="card-status-danger"
        />
        <BalanceCard
          title="Previsto (restante)"
          value={-1200.00}
          className="card-status-warning"
        />
      </section>

      {/* Alertas */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-medium text-lg text-foreground flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Atenção
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-lg border-l-4 bg-card ${
                  alert.type === "warning" ? "border-l-warning" : "border-l-destructive"
                }`}
              >
                <p className="text-sm text-foreground">{alert.message}</p>
                <CurrencyDisplay value={alert.value} size="sm" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grid de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas Movimentações */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-medium text-lg text-foreground">
              Últimas Movimentações
            </h2>
            <Link to="/transacoes">
              <Button variant="ghost" size="sm">
                Ver todas
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {mockTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                {...transaction}
                onClick={() => {}}
              />
            ))}
          </div>
        </section>

        {/* Sidebar direita */}
        <aside className="space-y-6">
          {/* Fluxo do Mês */}
          <div className="bg-card rounded-xl p-5 shadow-sm">
            <h3 className="font-display font-medium text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Fluxo do Mês
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-positive" />
                  <span className="text-sm text-muted-foreground">Entradas</span>
                </div>
                <CurrencyDisplay value={15800} size="sm" className="text-positive" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-negative" />
                  <span className="text-sm text-muted-foreground">Saídas</span>
                </div>
                <CurrencyDisplay value={3349.20} size="sm" className="text-negative" />
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Resultado</span>
                <CurrencyDisplay value={12450.80} size="sm" showSign className="font-semibold" />
              </div>
            </div>
          </div>

          {/* Próximas Faturas */}
          <div className="bg-card rounded-xl p-5 shadow-sm">
            <h3 className="font-display font-medium text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Próximas Faturas
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Nubank</p>
                  <p className="text-xs text-muted-foreground">Vence 28/12</p>
                </div>
                <div className="text-right">
                  <CurrencyDisplay value={2340.50} size="sm" />
                  <Badge variant="warning" className="mt-1">3 dias</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Inter</p>
                  <p className="text-xs text-muted-foreground">Vence 05/01</p>
                </div>
                <div className="text-right">
                  <CurrencyDisplay value={890.00} size="sm" />
                  <Badge variant="muted" className="mt-1">11 dias</Badge>
                </div>
              </div>
            </div>
            <Link to="/cartoes">
              <Button variant="ghost" size="sm" className="w-full mt-4">
                Ver todos os cartões
              </Button>
            </Link>
          </div>

          {/* Compartilhados */}
          <div className="bg-card rounded-xl p-5 shadow-sm">
            <h3 className="font-display font-medium text-foreground mb-4">
              Divisões Pendentes
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">AN</span>
                  </div>
                  <span className="text-sm text-foreground">Ana</span>
                </div>
                <CurrencyDisplay value={-125.50} size="sm" showSign />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-accent">CA</span>
                  </div>
                  <span className="text-sm text-foreground">Carlos</span>
                </div>
                <CurrencyDisplay value={87.30} size="sm" showSign />
              </div>
            </div>
            <Link to="/compartilhados">
              <Button variant="ghost" size="sm" className="w-full mt-4">
                Ver compartilhados
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}