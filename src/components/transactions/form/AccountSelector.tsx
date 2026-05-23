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
import { getBankById } from '@/lib/banks';
import { TabType } from '@/types/transactions';

interface AccountSelectorProps {
  accountId: string;
  setAccountId: (v: string) => void;
  activeTab: TabType;
  destinationAccountId: string;
  setDestinationAccountId: (v: string) => void;
  filteredAccounts: any[];
  transferAccounts: any[];
  selectedTrip?: any;
  selectedAccount?: any;
  isPaidByOther: boolean;
  payerName: string;
  customLabel?: string;
  customPlaceholder?: string;
}

export function AccountSelector({
  accountId,
  setAccountId,
  activeTab,
  destinationAccountId,
  setDestinationAccountId,
  filteredAccounts,
  transferAccounts,
  selectedTrip,
  selectedAccount,
  isPaidByOther,
  payerName,
  customLabel,
  customPlaceholder
}: AccountSelectorProps) {
  const navigate = useNavigate();
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
            <span className="text-xs text-muted-foreground">
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
            <span className="text-xs">
              Crie uma conta internacional com moeda {selectedTrip.currency} em Configurações.
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 h-auto text-amber-700 dark:text-amber-400 underline"
              onClick={() => navigate('/contas')}
            >
              Criar conta internacional
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    const getAccountLabel = () => {
      if (activeTab === 'EXPENSE') return 'Pagar com';
      if (activeTab === 'INCOME' || activeTab === 'DEPOSIT') return 'Receber em';
      if (activeTab === 'WITHDRAWAL') return 'Retirar de';
      return 'Conta';
    };

    return (
      <div className="space-y-2">
        <Label>{customLabel || getAccountLabel()}</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="h-12">
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
                    <span className="text-xs text-muted-foreground">
                      (Cartão)
                    </span>
                  )}
                  {acc.is_international && (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      {acc.currency}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTrip && selectedTrip.currency !== 'BRL' && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            🌍 Mostrando apenas contas em {selectedTrip.currency}
          </p>
        )}
        {selectedAccount?.is_international && !selectedTrip && (
          <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
            🌍 Transação em {selectedAccount.currency} (conta internacional)
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Sai de (Origem)</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="De onde sai" />
          </SelectTrigger>
          <SelectContent>
            {transferAccounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                <div className="flex items-center gap-2">
                  {acc.name}
                  {acc.type === 'EMERGENCY_FUND' && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                      Reserva
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Vai para (Destino)</Label>
        <Select
          value={destinationAccountId}
          onValueChange={setDestinationAccountId}
        >
          <SelectTrigger className="h-12">
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
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        Reserva
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
