import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Banknote, Pencil, Trash2, Archive, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface AccountInfo {
  id: string;
  name: string;
  balance: number;
  credit_limit: number | null;
  is_international: boolean | null;
  currency: string;
  type: string;
  hide_balance?: boolean;
  is_archived?: boolean | null;
}

interface BankInfo {
  color?: string;
  textColor?: string;
}

interface AccountBalanceCardProps {
  account: AccountInfo;
  bank: BankInfo | null;
  isCredit: boolean;
  canDelete?: boolean;
  formatCurrency: (value: number, currency?: string) => string;
  accountCurrency: string;
  onTransfer: () => void;
  onWithdrawal: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
}

export function AccountBalanceCard({
  account,
  bank,
  isCredit,
  canDelete = false,
  formatCurrency,
  accountCurrency,
  onTransfer,
  onWithdrawal,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive
}: AccountBalanceCardProps) {
  const { isPrivate } = usePrivacy();
  const shouldHideBalance = isPrivate || account.hide_balance;

  const bgColor = bank?.color || '#6366f1';
  const textColor = bank?.textColor || '#fff';

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ backgroundColor: bgColor }}
    >
      {/* Decoração de fundo */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20" style={{ backgroundColor: textColor }} />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full opacity-10" style={{ backgroundColor: textColor }} />

      <div className="relative p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: textColor, opacity: 0.7 }}>
          Saldo {isCredit ? "Atual" : "Disponível"}
        </p>
        <p
          className={cn("font-mono text-4xl md:text-5xl font-bold mb-2", shouldHideBalance && "blur-md opacity-50 select-none")}
          style={{ color: textColor }}
        >
          {shouldHideBalance ? "•••••" : `${Number(account.balance) >= 0 ? "" : "-"}${formatCurrency(Number(account.balance), accountCurrency)}`}
        </p>

        {isCredit && account.credit_limit && (
          <p className={cn("text-sm mb-1", shouldHideBalance && "blur-md opacity-50 select-none")} style={{ color: textColor, opacity: 0.75 }}>
            Limite disponível: {shouldHideBalance ? "•••••" : formatCurrency(Number(account.credit_limit), accountCurrency)}
          </p>
        )}
        {account.is_international && (
          <p className="text-xs mt-1" style={{ color: textColor, opacity: 0.7 }}>
            🌍 Conta Internacional · {accountCurrency}
          </p>
        )}

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5" style={{ borderTop: `1px solid ${textColor}30` }}>
          {!isCredit && (
            <>
              <Button onClick={onTransfer} variant="secondary" size="sm" className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transferir
              </Button>
              <Button onClick={onWithdrawal} variant="secondary" size="sm" className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <Banknote className="h-3.5 w-3.5" />
                Sacar
              </Button>
            </>
          )}
          <Button onClick={onEdit} variant="secondary" size="sm" className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button onClick={account.is_archived ? onUnarchive : onArchive} variant="secondary" size="sm" className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
            {account.is_archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {account.is_archived ? "Desarquivar" : "Arquivar"}
          </Button>
          {canDelete && (
            <Button onClick={onDelete} variant="secondary" size="sm" className="gap-1.5 bg-red-500/30 hover:bg-red-500/50 text-white border-0 backdrop-blur-sm">
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
