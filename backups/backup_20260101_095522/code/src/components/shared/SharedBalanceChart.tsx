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
import { format, subMonths, startOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChartDataPoint {
  month: string;
  credits: number;
  debits: number;
  net: number;
}

interface SharedBalanceChartProps {
  transactions: any[];
  invoices: Record<string, any[]>;
  currentDate: Date;
}

export function SharedBalanceChart({ transactions, invoices, currentDate }: SharedBalanceChartProps) {
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = [];
    const now = new Date();

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(startOfMonth(now), i);
      const monthKey = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM", { locale: ptBR });

      let credits = 0;
      let debits = 0;

      // Process all invoices for this month
      Object.values(invoices).forEach((items) => {
        items.forEach((item: any) => {
          // Parse date as YYYY-MM-DD to avoid timezone issues
          const [year, month, day] = item.date.split('-').map(Number);
          const itemMonth = month - 1; // JavaScript months are 0-indexed
          const itemYear = year;
          
          if (
            itemMonth === monthDate.getMonth() &&
            itemYear === monthDate.getFullYear()
          ) {
            if (item.type === "CREDIT" && !item.isPaid) {
              credits += item.amount;
            } else if (item.type === "DEBIT" && !item.isPaid) {
              debits += item.amount;
            }
          }
        });
      });

      data.push({
        month: monthLabel,
        credits,
        debits,
        net: credits - debits,
      });
    }

    return data;
  }, [invoices]);

  const currentMonthData = chartData[chartData.length - 1];
  const previousMonthData = chartData[chartData.length - 2];
  const trend = currentMonthData?.net - (previousMonthData?.net || 0);

  const formatCurrency = (value: number) => {
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
            <p className="text-positive">
              A receber: {formatCurrency(data.credits)}
            </p>
            <p className="text-negative">
              A pagar: {formatCurrency(data.debits)}
            </p>
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
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
