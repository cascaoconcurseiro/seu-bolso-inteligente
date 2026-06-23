import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useTransactionModal } from '@/hooks/useTransactionModal';
import { getBankById } from '@/lib/banks';
import { Target } from 'lucide-react';
import { useTransactionStore } from '@/store/useTransactionStore';

interface AccountSelectorProps {
  filteredAccounts: any[];
  transferAccounts: any[];
  selectedTrip?: any;
  selectedAccount?: any;
  isPaidByOther: boolean;
  payerName: string;
  customLabel?: string;
  customPlaceholder?: string;
  goals?: any[];
}

export function AccountSelector({
  filteredAccounts,
  transferAccounts,
  selectedTrip,
  selectedAccount,
  isPaidByOther,
  payerName,
  customLabel,
  customPlaceholder,
  goals
}: AccountSelectorProps) {
  const accountId = useTransactionStore((state) => state.accountId);
  const setAccountId = useTransactionStore((state) => state.setAccountId);
  const activeTab = useTransactionStore((state) => state.activeTab);
  const destinationAccountId = useTransactionStore((state) => state.destinationAccountId);
  const setDestinationAccountId = useTransactionStore((state) => state.setDestinationAccountId);
  const transferType = useTransactionStore((state) => state.transferType);
  const setTransferType = useTransactionStore((state) => state.setTransferType);
  const goalId = useTransactionStore((state) => state.goalId);
  const setGoalId = useTransactionStore((state) => state.setGoalId);

  const navigate = useNavigate();
  const { setShowTransactionModal } = useTransactionModal();
  const isExpense = activeTab === 'EXPENSE';
  const isTransfer = activeTab === 'TRANSFER';

  if (!isTransfer) {
    if (isPaidByOther) {
      return (
        <Alert className="bg-muted/50 border-primary/20">
          <Users className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            💡 Despesa paga por <span className="font-semibold">{payerName}</span> — não afeta suas contas.
            <br />
            <span className="text-sm text-muted-foreground">
              Esta despesa será registrada como débito seu com {payerName}.
            </span>
          </AlertDescription>
        </Alert>
      );
    }

    if (filteredAccounts.length === 0 && selectedTrip && selectedTrip.currency !== 'BRL') {
      return (
        <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
          <Wallet className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
            ⚠️ Nenhuma conta em <span className="font-semibold">{selectedTrip.currency}</span> encontrada.
            <br />
            <span className="text-sm">
              Crie uma conta internacional com moeda {selectedTrip.currency} em Contas.
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 h-auto text-amber-700 dark:text-amber-400 underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/contas';
              }}
            >
              Criar conta internacional
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    const getAccountLabel = () => {
      if (activeTab === 'EXPENSE') return 'Pagar com';
      if (activeTab === 'INCOME') return 'Receber em';
      return 'Conta';
    };

    return (
      <div className="space-y-1.5">
        <Label>{customLabel || getAccountLabel()}</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger>
            <SelectValue placeholder={customPlaceholder || "Selecione a conta"} />
          </SelectTrigger>
          <SelectContent>
            {filteredAccounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      backgroundColor: getBankById(acc.bank_id).color,
                    }}
                  />
                  {acc.name}
                  {acc.type === 'CREDIT_CARD' && (
                    <span className="text-sm text-muted-foreground">
                      (Cartão)
                    </span>
                  )}
                  {acc.is_international && (
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      {acc.currency}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTrip && selectedTrip.currency !== 'BRL' && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            🌍 Mostrando apenas contas em {selectedTrip.currency}
          </p>
        )}
        {selectedAccount?.is_international && !selectedTrip && (
          <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
            🌍 Transação em {selectedAccount.currency} (conta internacional)
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label>Sai de (Origem)</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger>
            <SelectValue placeholder="De onde sai" />
          </SelectTrigger>
          <SelectContent>
            {transferAccounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                <div className="flex items-center gap-2">
                  {acc.name}
                  {acc.type === 'EMERGENCY_FUND' && (
                    <span className="text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                      Reserva
                    </span>
                  )}
                  {acc.is_international && (
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      {acc.currency}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        
        <div className="flex items-center justify-between">
          <Label>Vai para (Destino)</Label>
          {setTransferType && (
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTransferType('account')}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${transferType === 'account' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                Conta
              </button>
              <button
                type="button"
                onClick={() => setTransferType('goal')}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${transferType === 'goal' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                Meta
              </button>
            </div>
          )}
        </div>

        <Select
          value={destinationAccountId}
          onValueChange={setDestinationAccountId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Para onde vai" />
          </SelectTrigger>
          <SelectContent>
            {transferAccounts
              .filter((a) => a.id !== accountId)
              .map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  <div className="flex items-center gap-2">
                    {acc.name}
                    {acc.type === 'EMERGENCY_FUND' && (
                      <span className="text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        Reserva
                      </span>
                    )}
                    {acc.is_international && (
                      <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                        {acc.currency}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
