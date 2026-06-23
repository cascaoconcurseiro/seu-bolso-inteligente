import React from 'react';
import {
  ArrowLeft,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  BellRing,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { SplitModal } from './SplitModal';
import { TabType } from '@/types/transactions';
import { Transaction } from '@/hooks/useTransactions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { moneyUtils } from "@/utils/money";

// Refactored Sub-components
import { AmountInput } from './form/AmountInput';
import { BasicInfoSection } from './form/BasicInfoSection';
import { AccountSelector } from './form/AccountSelector';
import { AdvancedOptions } from './form/AdvancedOptions';

import { useTransactionForm } from './form/useTransactionForm';

interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<Transaction>;
  context?: {
    tripId?: string;
    accountId?: string;
    categoryId?: string;
  };
}

export function TransactionForm(props: TransactionFormProps) {
  const form = useTransactionForm(props);

  if (form.accountsLoading || form.categoriesLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!form.accounts || form.accounts.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <ArrowDownLeft className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold">Nenhuma conta encontrada</h2>
        <p className="text-muted-foreground">Crie uma conta para começar</p>
        <Button type="button" onClick={(e) => { e.preventDefault(); form.setShowTransactionModal(false); form.navigate('/contas'); }}>Criar Conta</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-0 space-y-4 animate-fade-in overflow-x-hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => props.onCancel ? props.onCancel() : form.navigate(-1)} className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="font-display font-bold text-xl tracking-tight">Nova Transação</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-muted">
        {(['EXPENSE', 'INCOME', 'TRANSFER'] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => form.setActiveTab(tab)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all',
              form.activeTab === tab
                ? tab === 'EXPENSE'
                  ? 'bg-background text-destructive shadow-sm'
                  : tab === 'INCOME'
                  ? 'bg-background text-positive shadow-sm'
                  : 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'EXPENSE' && <ArrowUpRight className="h-4 w-4" />}
            {tab === 'INCOME' && <ArrowDownLeft className="h-4 w-4" />}
            {tab === 'TRANSFER' && <ArrowRightLeft className="h-4 w-4" />}
            
            {tab === 'EXPENSE' && 'Despesa'}
            {tab === 'INCOME' && 'Receita'}
            {tab === 'TRANSFER' && 'Transf.'}
          </button>
        ))}
      </div>

      {form.duplicateWarning && <Alert className="border-destructive/50 bg-destructive/10 animate-pulse"><BellRing className="h-4 w-4 text-destructive" /><AlertDescription className="text-destructive font-medium">⚠️ Possível transação duplicada detectada!</AlertDescription></Alert>}
      {form.budgetWarning && (
        <Alert className={cn(form.budgetWarning.exceeded ? "border-destructive/50 bg-destructive/10" : "border-yellow-500/50 bg-yellow-500/10", "animate-in slide-in-from-top-2")}>
          <BellRing className={cn("h-4 w-4", form.budgetWarning.exceeded ? "text-destructive" : "text-yellow-600")} />
          <AlertDescription className={cn("font-medium", form.budgetWarning.exceeded ? "text-destructive" : "text-yellow-700")}>
            {form.budgetWarning.message}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit} className="space-y-4">
        <AmountInput 
          currency={form.transactionCurrency} 
          currencySymbol={form.getCurrencySymbol(form.transactionCurrency)} 
          selectedTrip={form.selectedTrip} 
        />
        
        <BasicInfoSection
          categories={form.categories || []}
          categoriesLoading={form.categoriesLoading}
          selectedTrip={form.selectedTrip}
          predictedCategoryId={form.predictedCategoryId}
          isPredicting={form.isPredicting}
        /> 

        <AccountSelector 
          filteredAccounts={form.filteredAccounts} 
          transferAccounts={form.transferAccounts} 
          selectedTrip={form.selectedTrip} 
          selectedAccount={form.selectedAccount} 
          isPaidByOther={form.isPaidByOther} 
          payerName={form.payerId !== 'me' ? (form.familyMembers || []).find(m => m.id === form.payerId)?.name || 'outro' : ''} 
          goals={form.goals}
        />

        {form.showExchangePanel && (
          <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-4 animate-slide-in shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">🌍</div>
              <div>
                <p className="font-semibold text-sm tracking-tight text-foreground">Operação de Câmbio Detectada</p>
                <p className="text-sm text-muted-foreground">
                  {form.isCrossCurrencyTripExpense 
                    ? `Despesa na Viagem: ${form.selectedAccount?.currency} pagando ${form.selectedTrip?.currency}`
                    : `Transferência de ${form.selectedAccount?.currency} para ${form.selectedDestAccount?.currency}`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  {form.isCrossCurrencyTripExpense ? `Valor na Viagem (${form.selectedTrip?.currency})` : `Valor Recebido (${form.selectedDestAccount?.currency})`}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold z-10">
                    {form.getCurrencySymbol(form.isCrossCurrencyTripExpense ? (form.selectedTrip?.currency || 'USD') : (form.selectedDestAccount?.currency || 'USD'))}
                  </span>
                  <CurrencyInput
                    placeholder="0,00"
                    value={form.destinationAmount}
                    onChange={(val) => form.handleDestAmountChange(val)}
                    currency={form.isCrossCurrencyTripExpense ? (form.selectedTrip?.currency || 'USD') : (form.selectedDestAccount?.currency || 'USD')}
                    className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-70">
                <Label className="text-sm font-semibold text-foreground">Taxa de Câmbio Efetiva</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold z-10">
                    {form.selectedAccount?.currency}/{form.isCrossCurrencyTripExpense ? form.selectedTrip?.currency : form.selectedDestAccount?.currency}
                  </span>
                  <input
                    type="text"
                    placeholder="0,0000"
                    value={form.exchangeRate ? Number(form.exchangeRate).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : ''}
                    readOnly
                    className="w-full h-10 pl-16 pr-3 rounded-xl border border-border bg-muted text-sm font-medium focus:outline-none shadow-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground leading-normal">
              💡 Digite apenas o valor exato que chegou no destino. O sistema irá calcular automaticamente a taxa de câmbio efetiva (incluindo spread, IOF e outras taxas) baseada no valor de origem de {form.getCurrencySymbol(form.selectedAccount?.currency || 'BRL')} {moneyUtils.parse(form.amount || '0').toFixed(2)}.
            </p>
          </div>
        )}

        {form.isExpense && form.isCreditCard && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 animate-slide-in">
            <Label className="font-medium text-sm">Parcelas (Cartão de Crédito)</Label>
            <Select
              value={form.totalInstallments.toString()}
              onValueChange={(v) => {
                const val = parseInt(v);
                form.setTotalInstallments(val);
                form.setIsInstallment(val > 1);
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o parcelamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x de {form.getCurrencySymbol(form.transactionCurrency)} {(moneyUtils.parse(form.amount) || 0).toFixed(2).replace('.', ',')} (À vista)</SelectItem>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}x de {form.getCurrencySymbol(form.transactionCurrency)}{' '}
                    {((moneyUtils.parse(form.amount) || 0) / n).toFixed(2).replace('.', ',')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              A despesa será lançada no cartão e dividida nos meses do ciclo de faturas correspondente.
            </p>
          </div>
        )}

        <AdvancedOptions
          isExpense={form.isExpense}
          isCreditCard={form.isCreditCard}
          currencySymbol={form.getCurrencySymbol(form.transactionCurrency)}
          numericAmount={moneyUtils.parse(form.amount) || 0}
          
          trips={form.trips || []}
          hasSharing={form.hasSharing}
          availableMembers={form.availableMembers}
        />

        {form.validationErrors.length > 0 && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
            <p className="font-semibold mb-1">Corrija os seguintes erros:</p>
            <ul className="list-disc list-inside space-y-2">
              {form.validationErrors.map((err: string, i: number) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <Button type="submit" size="default" className="w-full text-base font-bold" disabled={form.createTransaction.isPending || form.updateTransaction?.isPending}>
          {form.createTransaction.isPending || form.updateTransaction?.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar'}
        </Button>
      </form>

      <SplitModal
        isOpen={form.showSplitModal}
        onClose={() => form.setShowSplitModal(false)}
        onConfirm={(s) => { form.setSplits(s); form.setShowSplitModal(false); }}
        payerId={form.payerId}
        setPayerId={form.setPayerId}
        splits={form.splits}
        setSplits={form.setSplits}
        familyMembers={form.familyMembers}
        activeAmount={moneyUtils.parse(form.amount) || 0}
        onNavigateToFamily={() => form.navigate('/familia')}
        isInstallment={form.isInstallment}
        setIsInstallment={form.setIsInstallment}
        totalInstallments={form.totalInstallments}
        setTotalInstallments={form.setTotalInstallments}
        currentUserName={(form.familyMembers || []).find(m => m.linked_user_id === form.user?.id)?.name || 'Eu'}
        currentUserMemberId={form.myMemberRecord?.id}
      />

      {form.showWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><BellRing className="h-5 w-5 text-amber-600" /></div>
              <div>
                <h3 className="font-semibold text-base mb-2">Atenção</h3>
                <p className="text-sm text-muted-foreground mb-3">Detectamos avisos. Continuar?</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-amber-600">
                  {form.validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { form.setShowWarningModal(false); form.setPendingSubmit(null); }}>Cancelar</Button>
              <Button className="flex-1" onClick={async () => { form.setShowWarningModal(false); if (form.pendingSubmit) await form.performSubmit(form.pendingSubmit as Partial<Transaction>); }}>Continuar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
