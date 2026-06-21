import React, { useState } from 'react';
import { Loader2, Plus, Trash2, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { AITripSuggestions } from './AITripSuggestions';
import { moneyUtils } from "@/utils/money";

interface ShoppingItem {
  id: string;
  item: string;
  estimatedCost: number;
  purchased: boolean;
}

interface TripShoppingProps {
  trip: {
    id: string;
    name: string;
    currency: string;
    destination?: string;
    shopping_list?: ShoppingItem[];
  };
  onUpdateTrip: (updates: { shopping_list: ShoppingItem[] }) => Promise<void>;
  isUpdating?: boolean;
}

export function TripShopping({ trip, onUpdateTrip, isUpdating = false }: TripShoppingProps) {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(
    trip.shopping_list || []
  );
  const [newItem, setNewItem] = useState('');
  const [newCost, setNewCost] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleApplyAISuggestions = async (suggestions: any[]) => {
    setIsAdding(true);
    const newItems: ShoppingItem[] = suggestions.map(s => ({
      id: crypto.randomUUID(),
      item: s.item,
      estimatedCost: Number(s.estimatedCost) || 0,
      purchased: false
    }));

    const updatedList = [...shoppingList, ...newItems];
    setShoppingList(updatedList);

    try {
      await onUpdateTrip({ shopping_list: updatedList });
      toast.success(`${suggestions.length} itens adicionados com sucesso!`);
    } catch (error) {
      setShoppingList(shoppingList);
      toast.error('Erro ao salvar sugestões');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCostChange = (value: string) => {
    setNewCost(value);
  };

  const getNumericCost = () => {
    return moneyUtils.parse(newCost) || 0;
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) {
      toast.error('Digite o nome do item');
      return;
    }

    const cost = getNumericCost();
    if (cost <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    setIsAdding(true);

    const newShoppingItem: ShoppingItem = {
      id: crypto.randomUUID(),
      item: newItem.trim(),
      estimatedCost: cost,
      purchased: false,
    };

    const updatedList = [...shoppingList, newShoppingItem];
    setShoppingList(updatedList);

    try {
      await onUpdateTrip({ shopping_list: updatedList });
      setNewItem('');
      setNewCost('');
      toast.success('Item adicionado');
    } catch (error) {
      setShoppingList(shoppingList);
      toast.error('Erro ao adicionar item');
    } finally {
      setIsAdding(false);
    }
  };

  const handleTogglePurchased = async (id: string) => {
    const updatedList = shoppingList.map((item) =>
      item.id === id ? { ...item, purchased: !item.purchased } : item
    );
    setShoppingList(updatedList);

    try {
      await onUpdateTrip({ shopping_list: updatedList });
    } catch (error) {
      setShoppingList(shoppingList);
      toast.error('Erro ao atualizar item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const updatedList = shoppingList.filter((item) => item.id !== id);
    setShoppingList(updatedList);

    try {
      await onUpdateTrip({ shopping_list: updatedList });
      toast.success('Item removido');
    } catch (error) {
      setShoppingList(shoppingList);
      toast.error('Erro ao remover item');
    }
  };

  const totalEstimated = shoppingList.reduce((sum, item) => sum + item.estimatedCost, 0);
  const totalPurchased = shoppingList
    .filter((item) => item.purchased)
    .reduce((sum, item) => sum + item.estimatedCost, 0);
  const purchasedCount = shoppingList.filter((item) => item.purchased).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            Previsão Total
          </p>
          <p className="font-mono text-2xl font-bold">
            {trip.currency} {totalEstimated.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {shoppingList.length} {shoppingList.length === 1 ? 'item' : 'itens'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            Já Comprado
          </p>
          <p className="font-mono text-2xl font-bold text-positive">
            {trip.currency} {totalPurchased.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {purchasedCount} de {shoppingList.length} itens
          </p>
        </div>
      </div>

      {/* Add New Item */}
      <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Adicionar Item</h3>
          </div>
          <AITripSuggestions 
            type="shopping"
            destination={trip.destination || trip.name}
            currency={trip.currency}
            onApply={handleApplyAISuggestions}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Item</Label>
            <Input
              placeholder="Ex: Protetor solar, Snorkel..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Custo Estimado ({trip.currency})</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm z-10">
                  {trip.currency}
                </span>
                <CurrencyInput
                  placeholder="0,00"
                  value={newCost}
                  onChange={handleCostChange}
                  currency={trip.currency}
                  className="pl-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAddItem}
                disabled={isAdding || isUpdating}
                size="icon"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping List */}
      {shoppingList.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border rounded-xl">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum item na lista</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione itens que deseja comprar para a viagem
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Lista de Compras
          </h3>
          {shoppingList.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                item.purchased 
                  ? "bg-muted/30 border-transparent opacity-70" 
                  : "bg-card/40 border-border/50 hover:bg-card/80 hover:shadow-sm"
              )}
            >
              <Checkbox
                checked={item.purchased}
                onCheckedChange={() => handleTogglePurchased(item.id)}
                className="flex-shrink-0 rounded-full h-5 w-5 border-muted-foreground/30 data-[state=checked]:bg-positive data-[state=checked]:border-positive data-[state=checked]:text-white shadow-sm transition-all duration-300"
              />

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium text-sm transition-all duration-300",
                    item.purchased
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground'
                  )}
                >
                  {item.item}
                </p>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  {trip.currency} {item.estimatedCost.toFixed(2)}
                </p>
              </div>

              {item.purchased && (
                <Check className="h-4 w-4 text-positive flex-shrink-0" />
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteItem(item.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
