import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAnticipateInstallments } from "@/hooks/useAnticipateInstallments";
import { cn } from "@/lib/utils";

interface AnticipateInstallmentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string;
  currentInstallment: number;
  totalInstallments: number;
  onSuccess?: () => void;
}

interface FutureInstallment {
  id: string;
  installment_number: number;
  description: string;
  amount: number;
  transaction_date: string;
  competence_date: string;
  is_settled: boolean;
  settled_by_debtor: boolean;
  settled_by_creditor: boolean;
}

/**
 * Dialog para antecipar parcelas futuras de uma série
 * 
 * Permite selecionar parcelas futuras não-acertadas e antecipar
 * a data de competência para o mês atual.
 * 
 * @example
 * ```tsx
 * <AnticipateInstallmentsDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   seriesId="series-123"
 *   currentInstallment={2}
 *   totalInstallments={12}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function AnticipateInstallmentsDialog({
  isOpen,
  onClose,
  seriesId,
  currentInstallment,
  totalInstallments,
  onSuccess
}: AnticipateInstallmentsDialogProps) {
  const [futureInstallments, setFutureInstallments] = useState<FutureInstallment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCompetenceDate, setNewCompetenceDate] = useState<string>("");

  const { mutate: anticipate, isLoading: isAnticipating } = useAnticipateInstallments();

  // Buscar parcelas futuras quando dialog abre
  useEffect(() => {
    if (isOpen && seriesId) {
      fetchFutureInstallments();
      // Definir data de competência como primeiro dia do mês atual
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setNewCompetenceDate(format(firstDay, 'yyyy-MM-dd'));
    }
  }, [isOpen, seriesId]);

  const fetchFutureInstallments = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 [AnticipateDialog] Buscando parcelas futuras:', {
        seriesId,
        currentInstallment
      });

      // Buscar parcelas futuras (installment_number > currentInstallment)
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, installment_number, description, amount, transaction_date, competence_date, is_settled')
        .eq('installment_series_id', seriesId)
        .gt('installment_number', currentInstallment)
        .order('installment_number', { ascending: true });

      if (txError) throw txError;

      if (!transactions || transactions.length === 0) {
        console.log('ℹ️ [AnticipateDialog] Nenhuma parcela futura encontrada');
        setFutureInstallments([]);
        setIsLoading(false);
        return;
      }

      console.log('📊 [AnticipateDialog] Transações encontradas:', transactions);

      // Buscar splits para verificar settlement status
      const txIds = transactions.map(t => t.id);
      const { data: splits, error: splitsError } = await supabase
        .from('transaction_splits')
        .select('transaction_id, is_settled, settled_by_debtor, settled_by_creditor')
        .in('transaction_id', txIds);

      if (splitsError) throw splitsError;

      console.log('📊 [AnticipateDialog] Splits encontrados:', splits);

      // Combinar dados e filtrar apenas não-acertadas
      const installmentsWithStatus = transactions.map(tx => {
        const txSplits = splits?.filter(s => s.transaction_id === tx.id) || [];
        const hasSettledSplit = txSplits.some(s => 
          s.is_settled || s.settled_by_debtor || s.settled_by_creditor
        );

        return {
          ...tx,
          settled_by_debtor: txSplits.some(s => s.settled_by_debtor),
          settled_by_creditor: txSplits.some(s => s.settled_by_creditor),
          is_settled: tx.is_settled || hasSettledSplit
        };
      });

      // Filtrar apenas não-acertadas
      const nonSettled = installmentsWithStatus.filter(i => !i.is_settled);

      console.log('✅ [AnticipateDialog] Parcelas não-acertadas:', nonSettled);

      setFutureInstallments(nonSettled);

      // Auto-selecionar todas as parcelas não-acertadas
      setSelectedIds(nonSettled.map(i => i.id));
    } catch (error) {
      console.error('❌ [AnticipateDialog] Erro ao buscar parcelas:', error);
      setFutureInstallments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleInstallment = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === futureInstallments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(futureInstallments.map(i => i.id));
    }
  };

  const handleAnticipate = () => {
    if (selectedIds.length === 0) {
      return;
    }

    anticipate(
      {
        seriesId,
        installmentIds: selectedIds,
        newCompetenceDate
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        }
      }
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { 
      style: "currency", 
      currency: "BRL" 
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parse(dateStr, 'yyyy-MM-dd', new Date());
      return format(date, "MMM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Antecipar Parcelas
          </DialogTitle>
          <DialogDescription>
            Selecione as parcelas futuras que deseja antecipar para o mês atual.
            Apenas parcelas não-acertadas podem ser antecipadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : futureInstallments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma parcela futura disponível para antecipar.</p>
              <p className="text-sm mt-2">
                Todas as parcelas futuras já foram acertadas ou não existem.
              </p>
            </div>
          ) : (
            <>
              {/* Data de competência */}
              <div className="space-y-2">
                <Label>Nova Data de Competência</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    {formatDate(newCompetenceDate)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-blue-600 ml-auto" />
                  <span className="text-sm text-muted-foreground">
                    As parcelas aparecerão neste mês
                  </span>
                </div>
              </div>

              {/* Lista de parcelas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Parcelas Disponíveis ({futureInstallments.length})</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs h-7"
                  >
                    {selectedIds.length === futureInstallments.length
                      ? "Desmarcar todas"
                      : "Selecionar todas"}
                  </Button>
                </div>

                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {futureInstallments.map(installment => (
                    <label
                      key={installment.id}
                      className={cn(
                        "flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                        selectedIds.includes(installment.id) && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.includes(installment.id)}
                        onCheckedChange={() => handleToggleInstallment(installment.id)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {installment.installment_number}/{totalInstallments}
                          </span>
                          <p className="text-sm font-medium truncate">
                            {installment.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Atual: {formatDate(installment.competence_date)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Novo: {formatDate(newCompetenceDate)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-medium">
                          {formatCurrency(installment.amount)}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resumo */}
              {selectedIds.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Parcelas selecionadas:</span>
                    <span className="font-bold">{selectedIds.length}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="font-medium">Valor total:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(
                        futureInstallments
                          .filter(i => selectedIds.includes(i.id))
                          .reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAnticipating}>
            Cancelar
          </Button>
          <Button
            onClick={handleAnticipate}
            disabled={isAnticipating || selectedIds.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnticipating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Antecipando...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Antecipar {selectedIds.length} Parcela(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
