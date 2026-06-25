import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ArrowRightLeft, Info } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trip } from "@/hooks/useTrips";
import { ExchangePurchase, ExchangePurchaseInput } from "@/types/tripExchange";
import { 
  useTripExchangePurchases, 
  useCreateExchangePurchase, 
  useUpdateExchangePurchase,
  useDeleteExchangePurchase,
  useExchangeSummary 
} from "@/hooks/useTripExchange";
import { ExchangeSummaryCard } from "./ExchangeSummaryCard";
import { ExchangePurchaseDialog } from "./ExchangePurchaseDialog";
import { getCurrencySymbol } from "@/services/exchangeCalculations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TripExchangeProps {
  trip: Trip;
  /** Total de gastos da viagem na moeda da viagem */
  totalExpenses?: number;
}

export function TripExchange({ trip, totalExpenses }: TripExchangeProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<ExchangePurchase | undefined>();
  const [deletingPurchase, setDeletingPurchase] = useState<ExchangePurchase | null>(null);

  const { data: purchases = [], isLoading } = useTripExchangePurchases(trip.id);
  const { data: summary } = useExchangeSummary(trip.id);
  const createPurchase = useCreateExchangePurchase();
  const updatePurchase = useUpdateExchangePurchase();
  const deletePurchase = useDeleteExchangePurchase();

  const currencySymbol = getCurrencySymbol(trip.currency);

  const handleSubmit = async (input: ExchangePurchaseInput) => {
    if (editingPurchase) {
      await updatePurchase.mutateAsync({
        id: editingPurchase.id,
        tripId: trip.id,
        input,
      });
    } else {
      await createPurchase.mutateAsync({
        tripId: trip.id,
        input,
      });
    }
    setShowDialog(false);
    setEditingPurchase(undefined);
  };

  const handleEdit = (purchase: ExchangePurchase) => {
    setEditingPurchase(purchase);
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (deletingPurchase) {
      await deletePurchase.mutateAsync({
        id: deletingPurchase.id,
        tripId: trip.id,
      });
      setDeletingPurchase(null);
    }
  };

  const handleOpenDialog = () => {
    setEditingPurchase(undefined);
    setShowDialog(true);
  };

  // Estado vazio
  if (!isLoading && purchases.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-accent/10 border border-accent/20 text-accent p-4 rounded-xl text-sm flex gap-3">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong>Cotações em Tempo Real:</strong> A cotação oficial da moeda ({trip.currency}) é sincronizada automaticamente com a AwesomeAPI para ajudar no seu planejamento e conversão de gastos.
          </p>
        </div>
        <EmptyState
          icon={ArrowRightLeft}
          title="Controle de Câmbio"
          description={`Registre suas compras de ${trip.currency} para calcular a taxa média ponderada que você pagou.`}
          action={
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Câmbio
            </Button>
          }
        />

        <ExchangePurchaseDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          currency={trip.currency}
          purchase={editingPurchase}
          onSubmit={handleSubmit}
          isLoading={createPurchase.isPending || updatePurchase.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      {summary && <ExchangeSummaryCard summary={summary} currency={trip.currency} totalExpenses={totalExpenses} />}

      {/* Lista de compras */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
            Compras de Câmbio ({purchases.length})
          </h2>
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-mono font-semibold">
                    {currencySymbol} {purchase.foreign_amount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="font-mono">
                    R$ {purchase.local_amount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  {purchase.is_automated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold bg-accent/10 text-accent border border-accent/20">
                      🌍 Automático - Conta Global
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>
                    Taxa: R$ {purchase.exchange_rate.toFixed(4)}
                  </span>
                  <span>
                    CET: {purchase.cet_percentage}%
                  </span>
                  <span>
                    Efetiva: R$ {purchase.effective_rate.toFixed(4)}
                  </span>
                    {dateFns.format(new Date(purchase.purchase_date), "dd MMM yyyy", { locale: ptBR })}
                </div>
                {purchase.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {purchase.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {purchase.is_automated ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex gap-2 cursor-not-allowed">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-40 pointer-events-none"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-40 pointer-events-none text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[240px] text-sm p-3">
                      Compra automática integrada das suas contas globais. Edite a transferência original na página de transações para efetuar alterações.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(purchase)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingPurchase(purchase)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dialog de criação/edição */}
      <ExchangePurchaseDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        currency={trip.currency}
        purchase={editingPurchase}
        onSubmit={handleSubmit}
        isLoading={createPurchase.isPending || updatePurchase.isPending}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingPurchase} onOpenChange={() => setDeletingPurchase(null)}>
        <AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compra de câmbio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A média ponderada será recalculada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
