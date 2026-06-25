import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BankIcon } from "@/components/financial/BankIcon";
import { useNavigate } from "react-router-dom";

interface AccountInfo {
  name: string;
  type: string;
  bank_id: string | null;
}

interface BankInfo {
  color?: string;
  textColor?: string;
}

interface AccountHeaderProps {
  account: AccountInfo;
  bank: BankInfo | null;
}

export function AccountHeader({ account, bank }: AccountHeaderProps) {
  const navigate = useNavigate();

  const typeLabel: Record<string, string> = {
    CHECKING: "Conta Corrente",
    SAVINGS: "Poupança",
    CREDIT_CARD: "Cartão de Crédito",
    INVESTMENT: "Investimento",
    CASH: "Dinheiro",
    EMERGENCY_FUND: "Reserva de Emergência",
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/contas")}
        className="rounded-xl shrink-0 hover:bg-muted"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      {bank && <BankIcon bankId={account.bank_id} size="lg" />}
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight truncate">{account.name}</h1>
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
          {typeLabel[account.type] ?? account.type}
        </p>
      </div>
    </div>
  );
}
