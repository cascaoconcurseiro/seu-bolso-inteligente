import React, { useState, useMemo } from "react";
import {
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  BellRing,
  RefreshCw,
  Plane,
  X,
  CalendarCheck,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isFuture, startOfDay } from "date-fns";
import { isWithinInterval, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { SplitModal } from "./SplitModal";
import { TabType } from "@/types/transactions";
import { Transaction } from "@/hooks/useTransactions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { moneyUtils } from "@/utils/money";
import { CurrencyInput } from "@/components/ui/currency-input";

// Refactored Sub-components
import { AmountInput } from "./form/AmountInput";
import { BasicInfoSection } from "./form/BasicInfoSection";
import { AccountSelector } from "./form/AccountSelector";
import { AdvancedOptions } from "./form/AdvancedOptions";

import { useTransactionForm } from "./form/useTransactionForm";
import { useUpdateRecurringSeries } from "@/hooks/transactions/useTransactionMutations";
import { moneyUtils as moneyUtilsImport } from "@/utils/money";

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
  const updateSeries = useUpdateRecurringSeries();
  const [seriesUpdateMode, setSeriesUpdateMode] = useState<"single" | "future">("single");
  const [tripBannerDismissed, setTripBannerDismissed] = useState(false);

  const isEditingRecurring = !!(
    props.initialData?.series_id &&
    props.initialData?.id &&
    props.initialData?.current_installment
  );

  // Viagem ativa: deve existir, cobrir a data de hoje, e o usuário ainda não ter selecionado/descartado
  const activeTrip = useMemo(() => {
    if (!form.trips || form.trips.length === 0) return null;
    const now = new Date();
    return (
      form.trips.find((t: any) => {
        try {
          return isWithinInterval(now, {
            start: parseISO(t.start_date),
            end: parseISO(t.end_date),
          });
        } catch {
          return false;
        }
      }) ?? null
    );
  }, [form.trips]);

  const showTripBanner =
    form.activeTab === "EXPENSE" &&
    !props.initialData?.id &&
    !!activeTrip &&
    !form.tripId &&
    !tripBannerDismissed;

  if (form.accountsLoading || form.categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form.accounts || form.accounts.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <ArrowDownLeft className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold">Nenhuma conta encontrada</h2>
        <p className="text-muted-foreground">Crie uma conta para começar</p>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            form.setShowTransactionModal(false);
            form.navigate("/contas");
          }}
        >
          Criar Conta
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-0 space-y-4 animate-fade-in overflow-x-hidden">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-[10px] bg-[hsl(var(--bg-subtle))]">
        {(["EXPENSE", "INCOME", "TRANSFER"] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => form.setActiveTab(tab)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[13px] font-medium transition-all",
              form.activeTab === tab
                ? "bg-[hsl(var(--bg-surface))] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "EXPENSE" && (
              <ArrowUpRight
                className={cn("h-4 w-4", form.activeTab === tab && "text-[hsl(var(--danger))]")}
              />
            )}
            {tab === "INCOME" && (
              <ArrowDownLeft
                className={cn("h-4 w-4", form.activeTab === tab && "text-[hsl(var(--success))]")}
              />
            )}
            {tab === "TRANSFER" && (
              <ArrowRightLeft
                className={cn("h-4 w-4", form.activeTab === tab && "text-[hsl(var(--accent))]")}
              />
            )}

            <span
              className={cn(
                form.activeTab === tab &&
                  (tab === "EXPENSE"
                    ? "text-[hsl(var(--danger))]"
                    : tab === "INCOME"
                      ? "text-[hsl(var(--success))]"
                      : "text-[hsl(var(--accent))]")
              )}
            >
              {tab === "EXPENSE" && "Despesa"}
              {tab === "INCOME" && "Receita"}
              {tab === "TRANSFER" && "Transf."}
            </span>
          </button>
        ))}
      </div>

      {/* Banner: vincular à viagem ativa */}
      {showTripBanner && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 animate-in slide-in-from-top-2 duration-300">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Plane className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Vincular à viagem?
            </p>
            <p className="text-xs text-muted-foreground truncate">{activeTrip.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 text-xs px-3 rounded-lg"
              onClick={() => {
                form.setTripId(activeTrip.id);
                setTripBannerDismissed(true);
              }}
            >
              Sim
            </Button>
            <button
              type="button"
              onClick={() => setTripBannerDismissed(true)}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {form.duplicateWarning && (
        <Alert className="border-destructive/50 bg-destructive/10 animate-pulse">
          <BellRing className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            ⚠️ Possível transação duplicada detectada!
          </AlertDescription>
        </Alert>
      )}
      {form.budgetWarning && (
        <Alert
          className={cn(
            form.budgetWarning.exceeded
              ? "border-destructive/50 bg-destructive/10"
              : "border-warning/50 bg-warning/12",
            "animate-in slide-in-from-top-2"
          )}
        >
          <BellRing
            className={cn(
              "h-4 w-4",
              form.budgetWarning.exceeded ? "text-destructive" : "text-warning"
            )}
          />
          <AlertDescription
            className={cn(
              "font-medium",
              form.budgetWarning.exceeded ? "text-destructive" : "text-warning"
            )}
          >
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
          payerName={
            form.payerId !== "me"
              ? (form.effectiveFamilyMembers || []).find((m) => m.id === form.payerId)?.name ||
                "outro"
              : ""
          }
          goals={form.goals}
        />

        {form.showExchangePanel && (
          <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 space-y-4 animate-slide-in shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent">
                🌍
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight text-foreground">
                  Operação de Câmbio Detectada
                </p>
                <p className="text-sm text-muted-foreground">
                  {form.isCrossCurrencyTripExpense
                    ? `Despesa na Viagem: ${form.selectedAccount?.currency} pagando ${form.selectedTrip?.currency}`
                    : `Transferência de ${form.selectedAccount?.currency} para ${form.selectedDestAccount?.currency}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {form.isCrossCurrencyTripExpense
                    ? `Valor na Viagem (${form.selectedTrip?.currency})`
                    : `Valor Recebido (${form.selectedDestAccount?.currency})`}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold z-10">
                    {form.getCurrencySymbol(
                      form.isCrossCurrencyTripExpense
                        ? form.selectedTrip?.currency || "USD"
                        : form.selectedDestAccount?.currency || "USD"
                    )}
                  </span>
                  <CurrencyInput
                    placeholder="0,00"
                    value={form.destinationAmount}
                    onChange={(val) => form.handleDestAmountChange(val)}
                    currency={
                      form.isCrossCurrencyTripExpense
                        ? form.selectedTrip?.currency || "USD"
                        : form.selectedDestAccount?.currency || "USD"
                    }
                    className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-background text-base text-foreground font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-70">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Taxa de Câmbio Efetiva
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold z-10">
                    {form.selectedAccount?.currency}/
                    {form.isCrossCurrencyTripExpense
                      ? form.selectedTrip?.currency
                      : form.selectedDestAccount?.currency}
                  </span>
                  <input
                    type="text"
                    placeholder="0,0000"
                    value={
                      form.exchangeRate
                        ? Number(form.exchangeRate).toLocaleString("pt-BR", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })
                        : ""
                    }
                    readOnly
                    className="w-full h-10 pl-20 pr-3 rounded-xl border border-border bg-muted text-sm font-medium focus:outline-none shadow-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-normal">
              💡 Digite apenas o valor exato que chegou no destino. O sistema irá calcular
              automaticamente a taxa de câmbio efetiva (incluindo spread, IOF e outras taxas)
              baseada no valor de origem de{" "}
              {form.getCurrencySymbol(form.selectedAccount?.currency || "BRL")}{" "}
              {moneyUtils.parse(form.amount || "0").toFixed(2)}.
            </p>
          </div>
        )}

        {form.isExpense && form.isCreditCard && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 animate-slide-in">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Parcelas (Cartão de Crédito)
            </Label>
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
                <SelectItem value="1">
                  1x de {form.getCurrencySymbol(form.transactionCurrency)}{" "}
                  {(moneyUtils.parse(form.amount) || 0).toFixed(2).replace(".", ",")} (À vista)
                </SelectItem>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}x de {form.getCurrencySymbol(form.transactionCurrency)}{" "}
                    {((moneyUtils.parse(form.amount) || 0) / n).toFixed(2).replace(".", ",")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              A despesa será lançada no cartão e dividida nos meses do ciclo de faturas
              correspondente.
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

        {/* Toggle "Agendar": aparece quando a data é futura e não é recorrente */}
        {isFuture(startOfDay(form.date)) && !form.isRecurring && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">
                  Agendar (não lançar agora)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aparece em "Próximas" até você marcar como pago
                </p>
              </div>
            </div>
            <Switch checked={form.saveAsPending} onCheckedChange={form.setSaveAsPending} />
          </div>
        )}

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

        {isEditingRecurring && (
          <div className="flex rounded-xl overflow-hidden border border-border/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSeriesUpdateMode("single")}
              className={cn(
                "flex-1 px-3 py-2 transition-colors",
                seriesUpdateMode === "single"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              Só esta
            </button>
            <button
              type="button"
              onClick={() => setSeriesUpdateMode("future")}
              className={cn(
                "flex-1 px-3 py-2 transition-colors flex items-center justify-center gap-1.5",
                seriesUpdateMode === "future"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <RefreshCw className="h-3 w-3" />
              Esta e próximas
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-1/2 h-11 text-base font-medium"
            onClick={() => (props.onCancel ? props.onCancel() : form.navigate(-1))}
          >
            Cancelar
          </Button>
          <Button
            type={isEditingRecurring && seriesUpdateMode === "future" ? "button" : "submit"}
            onClick={
              isEditingRecurring && seriesUpdateMode === "future"
                ? async (e) => {
                    e.preventDefault();
                    const amount = moneyUtilsImport.parse(form.amount);
                    await updateSeries.mutateAsync({
                      seriesId: props.initialData!.series_id!,
                      fromInstallment: props.initialData!.current_installment!,
                      updates: {
                        description: form.description || undefined,
                        amount: amount > 0 ? amount : undefined,
                        category_id: form.categoryId || undefined,
                        account_id: form.accountId || undefined,
                        notes: form.notes || undefined,
                      },
                    });
                    props.onSuccess?.();
                  }
                : undefined
            }
            variant="default"
            className="w-1/2 h-11 text-base font-bold"
            disabled={
              form.createTransaction.isPending ||
              form.updateTransaction?.isPending ||
              updateSeries.isPending
            }
          >
            {form.createTransaction.isPending ||
            form.updateTransaction?.isPending ||
            updateSeries.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </form>

      <SplitModal
        isOpen={form.showSplitModal}
        onClose={() => form.setShowSplitModal(false)}
        onConfirm={(s) => {
          form.setSplits(s);
          form.setShowSplitModal(false);
        }}
        payerId={form.payerId}
        setPayerId={form.setPayerId}
        splits={form.splits}
        setSplits={form.setSplits}
        familyMembers={form.effectiveFamilyMembers}
        activeAmount={moneyUtils.parse(form.amount) || 0}
        onNavigateToFamily={() => form.navigate("/familia")}
        isInstallment={form.isInstallment}
        setIsInstallment={form.setIsInstallment}
        totalInstallments={form.totalInstallments}
        setTotalInstallments={form.setTotalInstallments}
        currentUserName={
          (form.effectiveFamilyMembers || []).find((m) => m.linked_user_id === form.user?.id)
            ?.name || "Eu"
        }
        currentUserMemberId={form.myMemberRecord?.id}
      />

      {form.showWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/12 flex items-center justify-center">
                <BellRing className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-2">Atenção</h3>
                <p className="text-sm text-muted-foreground mb-3">Detectamos avisos. Continuar?</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-warning">
                  {form.validationWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  form.setShowWarningModal(false);
                  form.setPendingSubmit(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={async () => {
                  form.setShowWarningModal(false);
                  if (form.pendingSubmit)
                    await form.performSubmit(form.pendingSubmit as Partial<Transaction>);
                }}
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
