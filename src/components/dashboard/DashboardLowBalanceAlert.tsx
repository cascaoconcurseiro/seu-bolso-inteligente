import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { moneyUtils } from "@/utils/money";

interface DashboardLowBalanceAlertProps {
  currentBalance: number;
  threshold: number;
}

export function DashboardLowBalanceAlert({ currentBalance, threshold }: DashboardLowBalanceAlertProps) {
  if (!threshold || threshold <= 0 || currentBalance >= threshold) return null;

  return (
    <Link to="/contas" className="block">
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 transition-colors cursor-pointer">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Saldo baixo detectado</p>
          <p className="text-xs opacity-80 mt-0.5">
            Seu saldo disponível ({moneyUtils.format(currentBalance, "BRL")}) está abaixo do limite configurado de {moneyUtils.format(threshold, "BRL")}.
          </p>
        </div>
      </div>
    </Link>
  );
}
