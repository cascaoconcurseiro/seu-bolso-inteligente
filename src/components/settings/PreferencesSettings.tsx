import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Coins, CalendarDays, TrendingDown } from "lucide-react";
import { UserProfile } from "@/hooks/useUserProfile";
import { NumericFormat } from "react-number-format";

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
            <div className="flex-1 space-y-1 w-full">
              <Label>Dia de Início do Mês</Label>
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
                Define em qual dia os relatórios mensais "viram". Ideal se você recebe salário todo dia 5, por exemplo.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <Label>Moeda Padrão</Label>
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
            <div className="flex-1 space-y-1 w-full">
              <Label>Orçamento Mensal Global</Label>
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
