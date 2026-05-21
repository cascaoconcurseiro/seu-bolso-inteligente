import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Banknote, Pencil, Trash2 } from "lucide-react";

interface AccountInfo {
  id: string;
  name: string;
  balance: number;
  credit_limit: number | null;
  is_international: boolean | null;
  currency: string;
  type: string;
}

interface BankInfo {
  color?: string;
  textColor?: string;
}

interface AccountBalanceCardProps {
  account: AccountInfo;
  bank: BankInfo | null;
  isCredit: boolean;
  formatCurrency: (value: number, currency?: string) => string;
  accountCurrency: string;
  onTransfer: () => void;
  onWithdrawal: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AccountBalanceCard({
  account,
  bank,
  isCredit,
  formatCurrency,
  accountCurrency,
  onTransfer,
  onWithdrawal,
  onEdit,
  onDelete
}: AccountBalanceCardProps) {
  return (
    <div 
      className="p-8 rounded-2xl border border-border"
      style={{ backgroundColor: bank?.color || '#6366f1' }}
    >
      <p className="text-sm mb-2" style={{ color: bank?.textColor || '#fff', opacity: 0.8 }}>
        Saldo {isCredit ? "Atual" : "Disponível"}
      </p>
      <p 
        className="font-mono text-5xl font-bold mb-6"
        style={{ color: bank?.textColor || '#fff' }}
      >
        {Number(account.balance) >= 0 ? "" : "-"}{formatCurrency(Number(account.balance), accountCurrency)}
      </p>
      {isCredit && account.credit_limit && (
        <p className="text-sm" style={{ color: bank?.textColor || '#fff', opacity: 0.8 }}>
          Limite: {formatCurrency(Number(account.credit_limit), accountCurrency)}
        </p>
      )}
      {account.is_international && (
        <p className="text-xs mt-2" style={{ color: bank?.textColor || '#fff', opacity: 0.8 }}>
          🌍 Conta Internacional ({accountCurrency})
        </p>
      )}

      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
        {!isCredit && (
          <>
            <Button
              onClick={onTransfer}
              className="flex-1 gap-2"
              variant="outline"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transferir
            </Button>
            <Button
              onClick={onWithdrawal}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Banknote className="h-4 w-4" />
              Sacar
            </Button>
          </>
        )}
        <Button
          variant="outline"
          className={isCredit ? "flex-1 gap-2" : "gap-2"}
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          onClick={onDelete}
          className={isCredit ? "flex-1 gap-2 text-destructive hover:text-destructive" : "gap-2 text-destructive hover:text-destructive"}
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>
    </div>
  );
}
