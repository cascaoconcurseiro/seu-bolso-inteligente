import { useState } from 'react';
import { Edit, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Asset } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface AssetCardProps {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
}

const ASSET_TYPE_LABELS = {
  STOCK: 'Ação',
  BOND: 'Título',
  FUND: 'Fundo',
  CRYPTO: 'Cripto',
  REAL_ESTATE: 'Imóvel',
  OTHER: 'Outro',
};

export const AssetCard = ({ asset, onEdit, onDelete, onUpdatePrice }: AssetCardProps) => {
  const [isPriceUpdateOpen, setIsPriceUpdateOpen] = useState(false);
  const [newPrice, setNewPrice] = useState(asset.current_price?.toString() || '');

  const invested = (asset.quantity || 0) * (asset.purchase_price || 0);
  const currentValue = (asset.quantity || 0) * (asset.current_price || 0);
  const profitLoss = currentValue - invested;
  const profitLossPercentage = invested > 0 ? (profitLoss / invested) * 100 : 0;

  const handleUpdatePrice = () => {
    const price = parseFloat(newPrice);
    if (price > 0) {
      onUpdatePrice(asset.id, price);
      setIsPriceUpdateOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">{asset.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {ASSET_TYPE_LABELS[asset.type]}
              {asset.ticker && ` • ${asset.ticker}`}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsPriceUpdateOpen(true)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(asset)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(asset.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantidade</span>
              <span>{asset.quantity || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço de Compra</span>
              <span>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(asset.purchase_price || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço Atual</span>
              <span>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(asset.current_price || 0)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Investido</span>
              <span>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(invested)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Atual</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(currentValue)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lucro/Prejuízo</span>
              <div className="flex items-center gap-1">
                {profitLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`font-semibold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(profitLoss)}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right mt-1">
              {profitLossPercentage >= 0 ? '+' : ''}
              {profitLossPercentage.toFixed(2)}%
            </div>
          </div>

          {asset.notes && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {asset.notes}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPriceUpdateOpen} onOpenChange={setIsPriceUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Preço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo Preço</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceUpdateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePrice}>Atualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
