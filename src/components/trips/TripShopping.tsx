import React, { useState } from 'react';
import { Loader2, Plus, Trash2, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

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

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const cents = parseInt(numbers || '0') / 100;
    return cents.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setNewCost(formatted);
  };

  const getNumericCost = () => {
    return parseFloat(newCost.replace(/\./g, '').replace(',', '.')) || 0;
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
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
            Previsão Total
          </p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {trip.currency} {totalEstimated.toFixed(2)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {shoppingList.length} {shoppingList.length === 1 ? 'item' : 'itens'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
            Já Comprado
          </p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {trip.currency} {totalPurchased.toFixed(2)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {purchasedCount} de {shoppingList.length} itens
          </p>
        </div>
      </div>

      {/* Add New Item */}
      <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Adicionar Item</h3>
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {trip.currency}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={newCost}
                  onChange={handleCostChange}
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
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nenhum item na lista</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione itens que deseja comprar para a viagem
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Lista de Compras
          </h3>
          {shoppingList.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                item.purchased
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-background border-border hover:border-primary/50'
              }`}
            >
              <Checkbox
                checked={item.purchased}
                onCheckedChange={() => handleTogglePurchased(item.id)}
                className="flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    item.purchased
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {item.item}
                </p>
                <p
                  className={`text-sm ${
                    item.purchased ? 'text-muted-foreground' : 'text-primary'
                  }`}
                >
                  {trip.currency} {item.estimatedCost.toFixed(2)}
                </p>
              </div>

              {item.purchased && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteItem(item.id)}
                className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
