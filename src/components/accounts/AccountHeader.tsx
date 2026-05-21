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

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={() => navigate("/contas")} className="rounded-full">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      {bank && <BankIcon bankId={account.bank_id} size="lg" />}
      <div className="flex-1">
        <h1 className="font-display font-bold text-2xl tracking-tight">{account.name}</h1>
        <p className="text-muted-foreground text-sm">
          {account.type === "CHECKING" && "Conta Corrente"}
          {account.type === "SAVINGS" && "Poupança"}
          {account.type === "CREDIT_CARD" && "Cartão de Crédito"}
          {account.type === "INVESTMENT" && "Investimento"}
          {account.type === "CASH" && "Dinheiro"}
          {account.type === "EMERGENCY_FUND" && "Reserva de Emergência"}
        </p>
      </div>
    </div>
  );
}
