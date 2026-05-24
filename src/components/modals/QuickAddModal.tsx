import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategoriesHierarchical } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesHierarchical();
  const createTransaction = useCreateTransaction();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount.replace(',', '.'));
    
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    if (!description.trim()) {
      toast.error('A descrição é obrigatória.');
      return;
    }
    if (!accountId) {
      toast.error('A conta é obrigatória.');
      return;
    }
    if (!categoryId) {
      toast.error('A categoria é obrigatória.');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        amount: numericAmount,
        description: description.trim(),
        date,
        type: 'EXPENSE',
        account_id: accountId,
        category_id: categoryId,
        domain: 'PERSONAL',
        is_shared: false,
        payer_id: undefined,
        currency: 'BRL',
      });
      
      // Reset and close
      setAmount('');
      setDescription('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAccountId('');
      setCategoryId('');
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const filteredAccounts = accounts?.filter(a => !a.is_international && a.type !== 'CREDIT_CARD') || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Adição Rápida (Despesa)</DialogTitle>
        </DialogHeader>
        
        {accountsLoading || categoriesLoading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                className="text-lg font-bold"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                placeholder="Ex: Padaria, Uber..." 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={accountId} onValueChange={setAccountId} required>
                  <SelectTrigger><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                    {accounts?.filter(a => a.type === 'CREDIT_CARD').map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name} (Cartão)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories?.filter(c => !c.parent_category_id).map(category => (
                    <div key={category.id}>
                      <SelectItem value={category.id} className="font-semibold">
                        {category.icon} {category.name}
                      </SelectItem>
                      {categories.filter(c => c.parent_category_id === category.id).map(sub => (
                        <SelectItem key={sub.id} value={sub.id} className="pl-6 text-sm">
                          {sub.icon} {sub.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="w-full h-12 mt-2" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar Despesa'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
