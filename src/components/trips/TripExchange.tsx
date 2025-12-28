import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
        <div className="py-12 text-center border border-dashed border-border rounded-xl">
          <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">
            Controle de Câmbio
          </h3>
          <p className="text-muted-foreground mb-6">
            Registre suas compras de {trip.currency} para calcular a média ponderada
          </p>
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Câmbio
          </Button>
        </div>

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
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
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
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>
                    Taxa: R$ {purchase.exchange_rate.toFixed(4)}
                  </span>
                  <span>
                    CET: {purchase.cet_percentage}%
                  </span>
                  <span>
                    Efetiva: R$ {purchase.effective_rate.toFixed(4)}
                  </span>
                  <span>
                    {format(new Date(purchase.purchase_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
                {purchase.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {purchase.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
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
        <AlertDialogContent>
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
