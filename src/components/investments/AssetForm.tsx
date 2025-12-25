import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Asset } from '@/types/database';
import { useAccounts } from '@/hooks/useAccounts';

const assetSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['STOCK', 'BOND', 'FUND', 'CRYPTO', 'REAL_ESTATE', 'OTHER']),
  ticker: z.string().optional(),
  quantity: z.coerce.number().min(0, 'Quantidade não pode ser negativa').optional(),
  purchase_price: z.coerce.number().min(0, 'Preço não pode ser negativo').optional(),
  current_price: z.coerce.number().min(0, 'Preço não pode ser negativo').optional(),
  purchase_date: z.string().optional(),
  account_id: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ASSET_TYPES = [
  { value: 'STOCK', label: 'Ação' },
  { value: 'BOND', label: 'Título' },
  { value: 'FUND', label: 'Fundo' },
  { value: 'CRYPTO', label: 'Criptomoeda' },
  { value: 'REAL_ESTATE', label: 'Imóvel' },
  { value: 'OTHER', label: 'Outro' },
];

export const AssetForm = ({ asset, onSubmit, onCancel }: AssetFormProps) => {
  const { accounts } = useAccounts();

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: asset
      ? {
          name: asset.name,
          type: asset.type,
          ticker: asset.ticker || '',
          quantity: asset.quantity || 0,
          purchase_price: asset.purchase_price || 0,
          current_price: asset.current_price || 0,
          purchase_date: asset.purchase_date || '',
          account_id: asset.account_id || '',
          notes: asset.notes || '',
        }
      : {
          name: '',
          type: 'STOCK',
          ticker: '',
          quantity: 0,
          purchase_price: 0,
          current_price: 0,
          purchase_date: new Date().toISOString().split('T')[0],
          account_id: '',
          notes: '',
        },
  });

  const handleSubmit = (data: AssetFormData) => {
    if (asset) {
      onSubmit({ id: asset.id, ...data });
    } else {
      onSubmit(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Investimento</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Petrobras PN" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ticker"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticker (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: PETR4" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchase_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Compra</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço Atual</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purchase_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Compra (Opcional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conta Vinculada (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts?.filter(a => a.type === 'INVESTMENT').map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Vincule a conta de investimento onde este ativo está
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adicione observações sobre este investimento..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {asset ? 'Atualizar' : 'Criar'} Investimento
          </Button>
        </div>
      </form>
    </Form>
  );
};
