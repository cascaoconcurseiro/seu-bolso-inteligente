import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Loader2, CheckCircle, Link2, RefreshCw, Calculator } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useAssignDefaultAccount, useRecalculateBalances } from "@/hooks/useAccountManagement";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function OrphanTransactionsManager() {
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts();
  const assignDefaultAccount = useAssignDefaultAccount();
  const recalculateBalances = useRecalculateBalances();
  
  const [orphanCount, setOrphanCount] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Contar transações órfãs ao carregar
  useEffect(() => {
    const fetchOrphanCount = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { count, error } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("account_id", null)
          .neq("type", "TRANSFERÊNCIA")
          .or("payer_id.is.null,payer_id.eq.me")
          .eq("deleted", false);

        if (!error) {
          setOrphanCount(count || 0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrphanCount();
  }, [user]);

  // Filtrar apenas contas que podem receber transações (não cartões)
  const availableAccounts = accounts.filter(a => a.type !== "CARTÃO DE CRÉDITO");

  const handleAssign = async () => {
    if (!selectedAccountId) return;
    
    await assignDefaultAccount.mutateAsync(selectedAccountId);
    
    // Atualizar contagem
    const { count } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user?.id)
      .is("account_id", null)
      .neq("type", "TRANSFERÊNCIA")
      .or("payer_id.is.null,payer_id.eq.me")
      .eq("deleted", false);
    
    setOrphanCount(count || 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (orphanCount === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-positive" />
              Transações Vinculadas
            </CardTitle>
            <CardDescription>
              Todas as suas transações estão vinculadas a contas.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Recalcular Saldos Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5" />
              Recalcular Saldos
            </CardTitle>
            <CardDescription>
              Recalcula os saldos de todas as contas com base nas transações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => recalculateBalances.mutate()}
              disabled={recalculateBalances.isPending}
              variant="outline"
              className="w-full gap-2"
            >
              {recalculateBalances.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Recalcular Saldos
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Use se os saldos das contas estiverem incorretos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Transações sem Conta
          </CardTitle>
          <CardDescription>
            Você tem {orphanCount} transação(ões) sem conta vinculada.
            Vincule-as a uma conta para melhor organização.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Conta para vincular</label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(Number(account.balance))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAssign}
            disabled={!selectedAccountId || assignDefaultAccount.isPending}
            className="w-full gap-2"
          >
            {assignDefaultAccount.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Vincular {orphanCount} transação(ões)
          </Button>

          <p className="text-xs text-muted-foreground">
            Isso irá atribuir a conta selecionada a todas as transações que não têm conta vinculada
            (exceto transferências e transações pagas por outros).
          </p>
        </CardContent>
      </Card>

      {/* Recalcular Saldos Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5" />
            Recalcular Saldos
          </CardTitle>
          <CardDescription>
            Recalcula os saldos de todas as contas com base nas transações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => recalculateBalances.mutate()}
            disabled={recalculateBalances.isPending}
            variant="outline"
            className="w-full gap-2"
          >
            {recalculateBalances.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Recalcular Saldos
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Use se os saldos das contas estiverem incorretos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
