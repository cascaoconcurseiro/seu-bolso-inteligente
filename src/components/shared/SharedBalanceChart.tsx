import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { InvoiceItem } from "@/hooks/useSharedFinances";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";

interface ChartDataPoint {
  month: string;
  credits: number;
  debits: number;
  net: number;
}

interface SharedBalanceChartProps {
  transactions: any[];
  invoices?: Record<string, InvoiceItem[]>;
  currentDate: Date;
  isGeneralReport?: boolean;
  monthlyData?: any[];
  currency?: string;
}

export function SharedBalanceChart({
  transactions,
  invoices = {},
  currentDate,
  isGeneralReport = false,
  monthlyData = [],
  currency = "BRL"
}: SharedBalanceChartProps) {
  console.log('🟢 [SharedBalanceChart] Renderizando com:', {
    transactions: transactions?.length,
    invoicesCount: Object.keys(invoices || {}).length,
    isGeneralReport,
    monthlyDataCount: monthlyData?.length,
    currentDate
  });

  const chartData = useMemo(() => {
    if (isGeneralReport && monthlyData && monthlyData.length > 0) {
      console.log('🟢 [SharedBalanceChart] Usando monthlyData para relatório geral');
      return monthlyData.map(item => ({
        month: item.month,
        credits: item.income,
        debits: item.expense,
        net: SafeFinancialCalculator.subtract(item.income, item.expense)
      }));
    }

    console.log('🟢 [SharedBalanceChart] Calculando chartData compartilhado...');
    const data: ChartDataPoint[] = [];
    const now = new Date();

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = dateFns.subMonths(dateFns.startOfMonth(now), i);
      const monthLabel = dateFns.format(monthDate, "MMM", { locale: ptBR });

      let credits = 0;
      let debits = 0;

      // Process all invoices for this month
      Object.values(invoices).forEach((items) => {
        items.forEach((item: InvoiceItem) => {
          if (!item.date) return;

          // Parse date as YYYY-MM-DD to avoid timezone issues
          const datePart = item.date.split('T')[0];
          const [year, month] = datePart.split('-').map(Number);
          
          if (isNaN(year) || isNaN(month)) return;

          const itemMonth = month - 1; // JavaScript months are 0-indexed
          const itemYear = year;
          
          if (
            itemMonth === monthDate.getMonth() &&
            itemYear === monthDate.getFullYear()
          ) {
            if (item.type === "CREDIT" && !item.isPaid) {
              credits = SafeFinancialCalculator.add(credits, item.amount);
            } else if (item.type === "DEBIT" && !item.isPaid) {
              debits = SafeFinancialCalculator.add(debits, item.amount);
            }
          }
        });
      });

      data.push({
        month: monthLabel,
        credits,
        debits,
        net: SafeFinancialCalculator.subtract(credits, debits),
      });
    }

    return data;
  }, [invoices, isGeneralReport, monthlyData]);

  const safeChartData = chartData || [];
  const currentMonthData = safeChartData.length > 0 ? safeChartData[safeChartData.length - 1] : null;
  const previousMonthData = safeChartData.length > 1 ? safeChartData[safeChartData.length - 2] : null;
  const trend = currentMonthData ? SafeFinancialCalculator.subtract(currentMonthData.net, previousMonthData?.net || 0) : 0;

  const formatCurrency = (value: number) => {
    if (currency && currency !== "BRL") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        notation: "compact",
      }).format(value);
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium capitalize mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            {isGeneralReport ? (
              <>
                <p className="text-positive">
                  Receitas: {formatCurrency(data.credits)}
                </p>
                <p className="text-negative">
                  Despesas: {formatCurrency(data.debits)}
                </p>
              </>
            ) : (
              <>
                <p className="text-positive">
                  A receber: {formatCurrency(data.credits)}
                </p>
                <p className="text-negative">
                  A pagar: {formatCurrency(data.debits)}
                </p>
              </>
            )}
            <p className={data.net >= 0 ? "text-positive font-medium" : "text-negative font-medium"}>
              Saldo: {formatCurrency(data.net)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Evolução do Saldo
          </CardTitle>
          {trend !== 0 && (
            <div className={`flex items-center gap-1 text-sm ${trend > 0 ? "text-positive" : "text-negative"}`}>
              {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{formatCurrency(Math.abs(trend))}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="net"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorNet)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
