import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Coins, CalendarDays, TrendingDown } from "lucide-react";
import { UserProfile } from "@/hooks/useUserProfile";
import { NumericFormat } from "react-number-format";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface PreferencesSettingsProps {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: any;
}

export function PreferencesSettings({ profile, isLoading, updateProfile }: PreferencesSettingsProps) {
  const [baseCurrency, setBaseCurrency] = useState("BRL");
  const [monthStartDay, setMonthStartDay] = useState("1");
  const [monthlyBudget, setMonthlyBudget] = useState(0);

  useEffect(() => {
    if (profile) {
      setBaseCurrency(profile.base_currency || "BRL");
      setMonthStartDay(profile.month_start_day?.toString() || "1");
      setMonthlyBudget(profile.monthly_budget || 0);
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      base_currency: baseCurrency,
      month_start_day: parseInt(monthStartDay, 10) || 1,
      monthly_budget: monthlyBudget,
    });
  };

  const hasChanges = () => {
    if (!profile) return false;
    return (
      baseCurrency !== (profile.base_currency || "BRL") ||
      monthStartDay !== (profile.month_start_day?.toString() || "1") ||
      monthlyBudget !== (profile.monthly_budget || 0)
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
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1 w-full animate-in slide-in-from-bottom-2 duration-300 delay-100 fill-mode-both">
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
            <div className="flex-1 space-y-1 w-full animate-in slide-in-from-bottom-2 duration-300 delay-150 fill-mode-both">
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
            <div className="flex-1 space-y-1 w-full animate-in slide-in-from-bottom-2 duration-300 delay-200 fill-mode-both">
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
