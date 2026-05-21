import { cn } from "@/lib/utils";
import { TransactionItem } from "./TransactionItem";
import { Transaction, DayGroup } from "@/utils/transactionUtils";

interface FamilyMember {
  id: string;
  name: string;
  user_id?: string | null;
  linked_user_id?: string | null;
}

interface CurrentUser {
  id: string;
  email?: string;
}

interface PayerInfo {
  label: string;
  isMe: boolean;
}

interface TransactionListProps {
  dayGroups: DayGroup[];
  user: CurrentUser | null;
  familyMembers: FamilyMember[];
  formatCurrency: (value: number, currency?: string) => string;
  onDetails: (tx: Transaction) => void;
  onSettlement: (tx: Transaction) => void;
  onAdvance: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  isFullySettled: (tx: Transaction) => boolean;
  hasPendingSplits: (tx: Transaction) => boolean;
  getCreatorName: (tx: Transaction) => string | null;
  getPayerInfo: (tx: Transaction) => PayerInfo | null;
  selectedAccount: string;
}

export function TransactionList({
  dayGroups,
  user,
  familyMembers,
  formatCurrency,
  onDetails,
  onSettlement,
  onAdvance,
  onEdit,
  onDelete,
  isFullySettled,
  hasPendingSplits,
  getCreatorName,
  getPayerInfo,
  selectedAccount
}: TransactionListProps) {
  if (dayGroups.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-xl">
        <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        <p className="text-sm text-muted-foreground mt-2">Use o botão + para adicionar uma transação</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dayGroups.map((group) => (
        <div key={group.date} className="space-y-2">
          <div className="flex items-center justify-between py-2 px-1">
            <h3 className="font-medium text-sm text-muted-foreground">{group.label}</h3>
            <span className={cn(
              "font-mono text-sm font-medium",
              group.balance >= 0 ? "text-positive" : "text-negative"
            )}>
              {group.balance >= 0 ? "+" : ""}{formatCurrency(group.balance)}
            </span>
          </div>
          
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {group.transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                user={user}
                familyMembers={familyMembers}
                formatCurrency={formatCurrency}
                onDetails={onDetails}
                onSettlement={onSettlement}
                onAdvance={onAdvance}
                onEdit={onEdit}
                onDelete={onDelete}
                isFullySettled={isFullySettled}
                hasPendingSplits={hasPendingSplits}
                getCreatorName={getCreatorName}
                getPayerInfo={getPayerInfo}
                selectedAccount={selectedAccount}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
