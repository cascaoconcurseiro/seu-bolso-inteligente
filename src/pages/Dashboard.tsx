import { Link } from "react-router-dom";
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  CreditCard,
  Users,
  AlertCircle
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
  { id: 1, type: "invoice", label: "Fatura Nubank", value: -2340.00, dueDate: "28 dez", daysLeft: 3 },
  { id: 2, type: "shared", label: "Ana te deve", value: 156.00, person: "Ana" },
];

const recentActivity = [
  { id: 1, description: "Supermercado Extra", value: -234.50, category: "Alimentação", date: "Hoje" },
  { id: 2, description: "Salário", value: 8500.00, category: "Renda", date: "Ontem" },
  { id: 3, description: "Uber", value: -32.90, category: "Transporte", date: "22 dez" },
];

export function Dashboard() {
  const isPositive = financialState.trend === "positive";
  const balanceColor = isPositive ? "text-positive" : "text-negative";
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - O Número que Importa */}
      <section className="relative pb-12 lg:pb-20">
        {/* Greeting - sutil, não compete */}
        <p className="text-muted-foreground text-sm mb-8">
          Dezembro 2024
        </p>

        {/* Main Balance - Dominante */}
        <div className="max-w-2xl">
          <p className="text-muted-foreground text-sm font-medium mb-2 tracking-wide uppercase">
            Saldo atual
          </p>
          
          <h1 className={cn(
            "font-display text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight leading-none",
            balanceColor
          )}>
            {formatCurrency(financialState.balance)}
          </h1>

          {/* Context Line - Uma frase, não cards */}
          <p className="mt-6 text-base sm:text-lg text-muted-foreground">
            <span className="text-positive font-medium">
              +{formatCurrency(financialState.monthlyIncome)}
            </span>
            {" entrou, "}
            <span className="text-negative font-medium">
              -{formatCurrency(financialState.monthlyExpenses)}
            </span>
            {" saiu este mês."}
          </p>

          {/* Projection - Subtle */}
          <p className="mt-2 text-sm text-muted-foreground/70">
            Projeção para 31 dez: {formatCurrency(financialState.projection)}
          </p>
        </div>

        {/* Quick Action - Floating, não grid */}
        <div className="mt-8 sm:mt-0 sm:absolute sm:top-0 sm:right-0">
          <Link to="/transacoes/nova">
            <Button size="lg" className="rounded-full shadow-lg">
              <Plus className="h-5 w-5 mr-2" />
              Nova transação
            </Button>
          </Link>
        </div>
      </section>

      {/* Divider visual com breathing room */}
      <div className="h-px bg-border" />

      {/* Content Section - Assimétrico */}
      <section className="py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column - Atenção Necessária (peso visual maior) */}
          <div className="lg:col-span-7">
            {urgentItems.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Precisa de atenção
                  </h2>
                </div>

                <div className="space-y-4">
                  {urgentItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.type === "invoice" ? "/cartoes" : "/compartilhados"}
                      className="group block"
                    >
                      <div className="flex items-center justify-between py-4 border-b border-border/50 transition-colors hover:border-primary/30">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            item.type === "invoice" ? "bg-negative/10" : "bg-positive/10"
                          )}>
                            {item.type === "invoice" ? (
                              <CreditCard className="h-5 w-5 text-negative" />
                            ) : (
                              <Users className="h-5 w-5 text-positive" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {item.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.type === "invoice" 
                                ? `Vence em ${item.daysLeft} dias` 
                                : "Divisão pendente"
                              }
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
                          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity - Minimal */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Atividade recente
                </h2>
                <Link 
                  to="/transacoes" 
                  className="text-sm text-primary hover:underline"
                >
                  Ver todas
                </Link>
              </div>

              <div className="space-y-1">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        item.value > 0 ? "bg-positive" : "bg-muted-foreground/30"
                      )} />
                      <div>
                        <p className="text-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category} · {item.date}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "font-mono text-sm",
                      item.value > 0 ? "text-positive" : "text-foreground"
                    )}>
                      {item.value > 0 ? "+" : ""}{formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Respiro + Navegação Contextual */}
          <div className="lg:col-span-5 lg:pl-8 lg:border-l border-border/30">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
              Explorar
            </h2>

            <nav className="space-y-2">
              {[
                { 
                  to: "/cartoes", 
                  label: "Cartões", 
                  sublabel: "2 faturas abertas",
                  icon: CreditCard,
                  value: "-4.2k"
                },
                { 
                  to: "/compartilhados", 
                  label: "Compartilhados", 
                  sublabel: "3 pendências",
                  icon: Users,
                  value: "+312"
                },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {item.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.sublabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-sm",
                      item.value.startsWith("+") ? "text-positive" : "text-negative"
                    )}>
                      {item.value}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </nav>

            {/* Monthly Insight - Single, não múltiplos */}
            <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
              <p className="text-sm text-muted-foreground mb-2">Este mês você</p>
              <p className="text-xl font-display font-semibold text-foreground">
                Gastou 12% menos em alimentação
              </p>
              <div className="flex items-center gap-2 mt-3">
                <ArrowDownRight className="h-4 w-4 text-positive" />
                <span className="text-sm text-positive font-medium">
                  -R$ 340 vs. novembro
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
