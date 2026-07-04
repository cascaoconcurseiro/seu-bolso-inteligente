import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

interface WealthEvolutionChartProps {
  wealthHistory: { month_label: string; balance: number }[];
  formatCurrency: (value: number) => string;
}

export default function WealthEvolutionChart({
  wealthHistory,
  formatCurrency,
}: WealthEvolutionChartProps) {
  const isPositiveTrend = useMemo(() => {
    if (!wealthHistory || wealthHistory.length < 2) return true;
    const first = wealthHistory[0].balance;
    const last = wealthHistory[wealthHistory.length - 1].balance;
    return last >= first;
  }, [wealthHistory]);

  const strokeColor = isPositiveTrend ? "#10b981" : "#f43f5e";

  const SparklineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-border/50 bg-card/95 px-3 py-1.5 text-sm font-bold text-foreground shadow-xl backdrop-blur-md">
          <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">
            {payload[0].payload.month_label}
          </p>
          <p className="font-display">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="w-full lg:w-[280px] h-[90px] rounded-2xl border border-border/30 bg-card/10 backdrop-blur-sm p-3.5 relative overflow-hidden group/chart transition-all duration-300 hover:border-border/60"
      role="img"
      aria-label={`Gráfico de evolução patrimonial dos últimos 6 meses. Tendência ${isPositiveTrend ? "positiva" : "negativa"}.`}
    >
      <div className="absolute top-2.5 left-3.5 z-10 flex items-center gap-2 pointer-events-none">
        <span
          className={cn(
            "w-1.5 h-2 rounded-full animate-pulse",
            isPositiveTrend
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
          )}
        />
        <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Evolução (6 Meses)
        </p>
      </div>

      <div className="w-full h-full pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={wealthHistory} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="wealthEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={<SparklineTooltip />}
              cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.3 }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#wealthEvolutionGradient)"
              dot={{ r: 0 }}
              activeDot={{ r: 4, strokeWidth: 0, fill: strokeColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
