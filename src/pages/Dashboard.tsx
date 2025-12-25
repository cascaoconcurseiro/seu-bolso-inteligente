import { Link } from "react-router-dom";
import { 
  Plus, 
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  Users,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock data
const financialState = {
  balance: 12847.50,
  monthlyIncome: 8500.00,
  monthlyExpenses: 6234.80,
  projection: 15112.70,
  trend: "positive" as const,
};

const urgentItems = [
  { id: 1, type: "invoice", label: "Fatura Nubank", value: -2340.00, daysLeft: 3 },
  { id: 2, type: "shared", label: "Ana te deve", value: 156.00, person: "Ana" },
];

const recentActivity = [
  { id: 1, description: "Supermercado Extra", value: -234.50, category: "Alimentação", date: "Hoje" },
  { id: 2, description: "Salário", value: 8500.00, category: "Renda", date: "Ontem" },
  { id: 3, description: "Uber", value: -32.90, category: "Transporte", date: "22 dez" },
  { id: 4, description: "Netflix", value: -55.90, category: "Assinaturas", date: "20 dez" },
];

export function Dashboard() {
  const isPositive = financialState.trend === "positive";
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero - Balance */}
      <section className="relative">
        <p className="text-muted-foreground text-sm mb-4 uppercase tracking-widest font-medium">
          Saldo atual
        </p>
        
        <div className="flex items-start justify-between gap-8">
          <div>
            <h1 className={cn(
              "font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter"
            )}>
              {formatCurrency(financialState.balance)}
            </h1>

            <div className="flex items-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-positive" />
                <span className="text-muted-foreground">Entradas</span>
                <span className="font-mono font-medium text-positive">
                  {formatCurrency(financialState.monthlyIncome)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-negative" />
                <span className="text-muted-foreground">Saídas</span>
                <span className="font-mono font-medium text-negative">
                  {formatCurrency(financialState.monthlyExpenses)}
                </span>
              </div>
            </div>
          </div>

          <Link to="/transacoes/nova">
            <Button size="lg" className="hidden sm:flex">
              <Plus className="h-5 w-5 mr-2" />
              Nova transação
            </Button>
          </Link>
        </div>

        {/* Mobile CTA */}
        <Link to="/transacoes/nova" className="sm:hidden block mt-6">
          <Button size="lg" className="w-full">
            <Plus className="h-5 w-5 mr-2" />
            Nova transação
          </Button>
        </Link>
      </section>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Attention Section */}
          {urgentItems.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Precisa de atenção
              </h2>
              <div className="space-y-2">
                {urgentItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.type === "invoice" ? "/cartoes" : "/compartilhados"}
                    className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        item.type === "invoice" ? "bg-negative/10" : "bg-positive/10"
                      )}>
                        {item.type === "invoice" ? (
                          <CreditCard className={cn("h-5 w-5", "text-negative")} />
                        ) : (
                          <Users className={cn("h-5 w-5", "text-positive")} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.type === "invoice" ? `Vence em ${item.daysLeft} dias` : "Divisão pendente"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "font-mono text-lg font-semibold",
                        item.value > 0 ? "text-positive" : "text-negative"
                      )}>
                        {item.value > 0 ? "+" : ""}{formatCurrency(item.value)}
                      </span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Atividade recente
              </h2>
              <Link to="/transacoes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Ver todas
              </Link>
            </div>
            <div className="space-y-1">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-4 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">{item.category} · {item.date}</p>
                  </div>
                  <span className={cn(
                    "font-mono font-medium",
                    item.value > 0 ? "text-positive" : "text-foreground"
                  )}>
                    {item.value > 0 ? "+" : ""}{formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Quick Links */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Acesso rápido
            </h2>
            <div className="space-y-2">
              {[
                { to: "/cartoes", label: "Cartões", sublabel: "2 faturas", icon: CreditCard },
                { to: "/compartilhados", label: "Compartilhados", sublabel: "3 pendências", icon: Users },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </div>
          </section>

          {/* Insight */}
          <section className="p-6 rounded-xl border border-border">
            <p className="text-sm text-muted-foreground mb-1">Este mês você</p>
            <p className="font-display font-semibold text-lg">
              Gastou 12% menos em alimentação
            </p>
            <p className="text-sm text-positive mt-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              -R$ 340 vs. novembro
            </p>
          </section>

          {/* Month Projection */}
          <section className="p-6 rounded-xl bg-foreground text-background">
            <p className="text-sm opacity-70 mb-1">Projeção fim do mês</p>
            <p className="font-display font-bold text-2xl">
              {formatCurrency(financialState.projection)}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
