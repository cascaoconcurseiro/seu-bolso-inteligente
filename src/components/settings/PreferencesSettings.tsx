import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Coins, CalendarDays, TrendingDown, CreditCard, BellRing, Wallet } from "lucide-react";
import { UserProfile } from "@/hooks/useUserProfile";
import { useAccounts } from "@/hooks/useAccounts";
import { NumericFormat } from "react-number-format";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface PreferencesSettingsProps {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: any;
}

export function PreferencesSettings({ profile, isLoading, updateProfile }: PreferencesSettingsProps) {
  const { data: accounts } = useAccounts();
  const [baseCurrency, setBaseCurrency] = useState("BRL");
  const [monthStartDay, setMonthStartDay] = useState("1");
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [sharedExpensesBehavior, setSharedExpensesBehavior] = useState<string>("CURRENT_MONTH");
  const [sharedSyncCreditCardId, setSharedSyncCreditCardId] = useState<string>("none");
  const [globalCdiRate, setGlobalCdiRate] = useState<number>(11.15);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<number>(0);
  const [defaultAccountId, setDefaultAccountId] = useState<string>("none");
  const [defaultCreditCardId, setDefaultCreditCardId] = useState<string>("none");

  const creditCards = accounts?.filter(acc => acc.type === 'CREDIT_CARD') || [];
  const checkingAccounts = accounts?.filter(acc => acc.type !== 'CREDIT_CARD') || [];

  useEffect(() => {
    if (profile) {
      setBaseCurrency(profile.base_currency || "BRL");
      setMonthStartDay(profile.month_start_day?.toString() || "1");
      setMonthlyBudget(profile.monthly_budget || 0);
      setSharedExpensesBehavior(profile.shared_expenses_behavior || "CURRENT_MONTH");
      
      let initialCardId = profile.shared_sync_credit_card_id || "none";
      if (initialCardId === "none" && profile.shared_expenses_behavior === "CYCLE" && creditCards.length > 0) {
        initialCardId = creditCards[0].id;
      }
      setSharedSyncCreditCardId(initialCardId);
      setGlobalCdiRate(profile.global_cdi_rate ?? 11.15);
      setLowBalanceThreshold(profile.low_balance_threshold ?? 0);
      setDefaultAccountId(profile.default_account_id || "none");
      setDefaultCreditCardId(profile.default_credit_card_id || "none");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      baseCurrency: baseCurrency,
      month_start_day: parseInt(monthStartDay, 10) || 1,
      monthly_budget: monthlyBudget,
      shared_expenses_behavior: sharedExpensesBehavior,
      shared_sync_credit_card_id: sharedSyncCreditCardId === "none" ? null : sharedSyncCreditCardId,
      global_cdi_rate: globalCdiRate,
      low_balance_threshold: lowBalanceThreshold || null,
      default_account_id: defaultAccountId === "none" ? null : defaultAccountId,
      default_credit_card_id: defaultCreditCardId === "none" ? null : defaultCreditCardId,
    });
  };

  const hasChanges = () => {
    if (!profile) return false;
    const currentCardId = profile.shared_sync_credit_card_id || "none";
    return (
      baseCurrency !== (profile.base_currency || "BRL") ||
      monthStartDay !== (profile.month_start_day?.toString() || "1") ||
      monthlyBudget !== (profile.monthly_budget || 0) ||
      sharedExpensesBehavior !== (profile.shared_expenses_behavior || "CURRENT_MONTH") ||
      sharedSyncCreditCardId !== currentCardId ||
      globalCdiRate !== (profile.global_cdi_rate ?? 11.15) ||
      lowBalanceThreshold !== (profile.low_balance_threshold ?? 0) ||
      defaultAccountId !== (profile.default_account_id || "none") ||
      defaultCreditCardId !== (profile.default_credit_card_id || "none")
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="font-display font-semibold text-lg">Preferências Financeiras</h2>
        <p className="text-sm text-muted-foreground">Configure as moedas, datas e limites globais da sua conta.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="space-y-4">

          {/* CONTA PADRÃO */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <Label>Conta Padrão</Label>
                <InfoTooltip content="Pré-selecionada ao abrir nova transação de receita ou transferência." />
              </div>
              <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
                <SelectTrigger><SelectValue placeholder="Sem padrão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem conta padrão</SelectItem>
                  {checkingAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CARTÃO PADRÃO */}
          {creditCards.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <Label>Cartão Padrão</Label>
                  <InfoTooltip content="Pré-selecionado ao abrir nova despesa. Tem prioridade sobre a conta padrão." />
                </div>
                <Select value={defaultCreditCardId} onValueChange={setDefaultCreditCardId}>
                  <SelectTrigger><SelectValue placeholder="Sem padrão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cartão padrão</SelectItem>
                    {creditCards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2 w-full animate-in slide-in-from-bottom-2 duration-300 delay-100 fill-mode-both">
              <div className="flex items-center gap-2">
                <Label>Dia de Início do Mês</Label>
                <InfoTooltip content="Define em qual dia o seu ciclo financeiro mensal reinicia. Ex: Se você recebe salário no dia 5, configure como dia 5. O app calculará seu saldo do dia 5 ao dia 4 do mês seguinte." />
              </div>
              <Select value={monthStartDay} onValueChange={setMonthStartDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Muda a janela de datas dos seus relatórios.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2 w-full animate-in slide-in-from-bottom-2 duration-300 delay-150 fill-mode-both">
              <div className="flex items-center gap-2">
                <Label>Moeda Padrão</Label>
                <InfoTooltip content="A moeda principal na qual os seus totais consolidados de painel (Dashboard e DRE) serão exibidos." />
              </div>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (BRL)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2 w-full animate-in slide-in-from-bottom-2 duration-300 delay-200 fill-mode-both">
              <div className="flex items-center gap-2">
                <Label>Orçamento Mensal Global</Label>
                <InfoTooltip content="Um limite máximo planejado para suas saídas do mês. Uma barra de acompanhamento aparecerá no Dashboard alertando se você estiver perto do limite." />
              </div>
              <NumericFormat
                value={monthlyBudget || ""}
                onValueChange={(values) => {
                  setMonthlyBudget(values.floatValue || 0);
                }}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                customInput={Input}
                placeholder="R$ 0,00 (Desativado)"
              />
              <p className="text-xs text-muted-foreground">
                Seu limite de gastos no mês. Se definido, mostraremos um medidor no Dashboard (deixe R$ 0,00 para desativar).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2 w-full animate-in slide-in-from-bottom-2 duration-300 delay-200 fill-mode-both">
              <div className="flex items-center gap-2">
                <Label>Taxa CDI Atual (%)</Label>
                <InfoTooltip content="Usado para calcular o rendimento automático da sua Reserva de Emergência e Investimentos. O valor atual é por volta de 11,15% ao ano." />
              </div>
              <NumericFormat
                value={globalCdiRate}
                onValueChange={(values) => {
                  setGlobalCdiRate(values.floatValue || 0);
                }}
                thousandSeparator="."
                decimalSeparator=","
                suffix=" % ao ano"
                decimalScale={2}
                fixedDecimalScale
                customInput={Input}
                placeholder="Ex: 11,15 % ao ano"
              />
              <p className="text-xs text-muted-foreground">
                Mantenha atualizado conforme as reuniões do COPOM para maior precisão nos rendimentos diários.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2 w-full animate-in slide-in-from-bottom-2 duration-300 delay-250 fill-mode-both">
              <div className="flex items-center gap-2">
                <Label>Alerta de Saldo Baixo</Label>
                <InfoTooltip content="Quando o saldo total das suas contas correntes cair abaixo deste valor, um alerta aparecerá no Dashboard. Deixe R$ 0,00 para desativar." />
              </div>
              <NumericFormat
                value={lowBalanceThreshold || ""}
                onValueChange={(values) => setLowBalanceThreshold(values.floatValue || 0)}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                customInput={Input}
                placeholder="R$ 0,00 (Desativado)"
              />
              <p className="text-xs text-muted-foreground">
                Aviso visual no Dashboard quando seu saldo disponível ficar abaixo do limite definido.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-6 pt-6 border-t border-border">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-3 w-full animate-in slide-in-from-bottom-2 duration-300 delay-300 fill-mode-both">
              <div className="flex items-center gap-2">
                <Label>Ciclo de Despesas Compartilhadas</Label>
                <InfoTooltip content="Define se os compartilhamentos feitos em dinheiro/conta caem no mês atual ou se seguem um ciclo parecido com cartão de crédito (para você cobrar a pessoa no próximo mês)." />
              </div>
              <Select value={sharedExpensesBehavior} onValueChange={(val) => {
                setSharedExpensesBehavior(val);
                if (val === "CYCLE" && sharedSyncCreditCardId === "none" && creditCards.length > 0) {
                  setSharedSyncCreditCardId(creditCards[0].id);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENT_MONTH">Cobrar no Mês do Lançamento</SelectItem>
                  <SelectItem value="CYCLE">Seguir Ciclo do Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg border border-border/50 space-y-2 mt-3">
                {sharedExpensesBehavior === "CURRENT_MONTH" ? (
                  <>
                    <p className="font-semibold text-foreground">Cobrar no Mês do Lançamento:</p>
                    <p>Despesas pagas em dinheiro ou conta bancária serão cobradas no acerto (settlement) do <strong>exato mês</strong> em que a compra foi feita.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Seguir Ciclo do Cartão de Crédito:</p>
                    <p>Despesas pagas em dinheiro ou conta bancária funcionarão igual a um cartão de crédito. Sincronize com um cartão mestre e tudo que for gasto acumulará para o seu parceiro(a) pagar apenas no mês seguinte.</p>
                  </>
                )}
              </div>
              
              {sharedExpensesBehavior === "CYCLE" && (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200 p-4 bg-primary/5 border border-primary/20 rounded-xl mt-4">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Sincronizar com qual Cartão?
                  </Label>
                  {creditCards.length > 0 ? (
                    <Select value={sharedSyncCreditCardId} onValueChange={setSharedSyncCreditCardId}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Selecione um cartão de crédito" />
                      </SelectTrigger>
                      <SelectContent>
                        {creditCards.map(card => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-md">
                      Você não possui cartões de crédito cadastrados. Crie um cartão primeiro ou mude o comportamento para "Cobrar no Mês do Lançamento".
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
        </div>

        <div className="pt-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges() || updateProfile.isPending}
            className="w-full sm:w-auto"
          >
            {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Preferências
          </Button>
        </div>
      </div>
    </div>
  );
}
