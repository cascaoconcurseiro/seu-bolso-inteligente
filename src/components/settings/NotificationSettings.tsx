import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface NotificationSettingsProps {
  preferences: any;
  isLoading: boolean;
  isUpdating: boolean;
  updatePreferences: (prefs: any) => void;
}

export function NotificationSettings({ preferences, isLoading, isUpdating, updatePreferences }: NotificationSettingsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-semibold text-lg">Notificações</h2>
        <p className="text-sm text-muted-foreground">Configure alertas e lembretes do sistema</p>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cartões de Crédito</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Vencimento de Faturas</p>
                <p className="text-sm text-muted-foreground">Alertas {preferences?.invoice_due_days_before || 3} dias antes do vencimento</p>
              </div>
              <Switch checked={preferences?.invoice_due_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ invoice_due_enabled: checked })} disabled={isUpdating} />
            </div>
            {preferences?.invoice_due_enabled && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm">Dias de antecedência</Label>
                <Select value={String(preferences?.invoice_due_days_before || 3)} onValueChange={(v) => updatePreferences({ invoice_due_days_before: parseInt(v) })}>
                  <SelectTrigger className="w-32 mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="2">2 dias</SelectItem>
                    <SelectItem value="3">3 dias</SelectItem>
                    <SelectItem value="5">5 dias</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Orçamentos</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alertas de Orçamento</p>
                <p className="text-sm text-muted-foreground">Aviso quando atingir {preferences?.budget_warning_threshold || 80}% do limite</p>
              </div>
              <Switch checked={preferences?.budget_warning_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ budget_warning_enabled: checked })} disabled={isUpdating} />
            </div>
            {preferences?.budget_warning_enabled && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm">Limite de alerta</Label>
                <Select value={String(preferences?.budget_warning_threshold || 80)} onValueChange={(v) => updatePreferences({ budget_warning_threshold: parseInt(v) })}>
                  <SelectTrigger className="w-32 mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Despesas Compartilhadas</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Divisões Pendentes</p>
                <p className="text-sm text-muted-foreground">Lembrete de valores a receber de membros</p>
              </div>
              <Switch checked={preferences?.shared_pending_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ shared_pending_enabled: checked })} disabled={isUpdating} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Transações Recorrentes</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Recorrências Pendentes</p>
                <p className="text-sm text-muted-foreground">Aviso quando há transações recorrentes para gerar</p>
              </div>
              <Switch checked={preferences?.recurring_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ recurring_enabled: checked })} disabled={isUpdating} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Metas e Economia</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Progresso de Metas</p>
                <p className="text-sm text-muted-foreground">Atualizações sobre suas metas de economia</p>
              </div>
              <Switch checked={preferences?.savings_goal_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ savings_goal_enabled: checked })} disabled={isUpdating} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Contas Bancárias</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Saldo Baixo</p>
                <p className="text-sm text-muted-foreground">Alerta quando o saldo cair abaixo do limite</p>
              </div>
              <Switch checked={preferences?.low_balance_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ low_balance_enabled: checked })} disabled={isUpdating} />
            </div>
            {preferences?.low_balance_enabled !== false && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm">Limite mínimo de saldo</Label>
                <Select value={String(preferences?.low_balance_threshold ?? 100)} onValueChange={(v) => updatePreferences({ low_balance_threshold: parseInt(v) })}>
                  <SelectTrigger className="w-40 mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">R$ 50</SelectItem>
                    <SelectItem value="100">R$ 100</SelectItem>
                    <SelectItem value="200">R$ 200</SelectItem>
                    <SelectItem value="500">R$ 500</SelectItem>
                    <SelectItem value="1000">R$ 1.000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cartões de Crédito</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Limite do Cartão</p>
                <p className="text-sm text-muted-foreground">Aviso quando o uso ultrapassar o percentual configurado</p>
              </div>
              <Switch checked={preferences?.credit_limit_warning_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ credit_limit_warning_enabled: checked })} disabled={isUpdating} />
            </div>
            {preferences?.credit_limit_warning_enabled !== false && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm">Alerta a partir de</Label>
                <Select value={String(preferences?.credit_limit_warning_threshold ?? 90)} onValueChange={(v) => updatePreferences({ credit_limit_warning_threshold: parseInt(v) })}>
                  <SelectTrigger className="w-32 mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="95">95%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Resumos</h3>
          <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Resumo Semanal</p>
                <p className="text-sm text-muted-foreground">Relatório semanal das suas finanças</p>
              </div>
              <Switch checked={preferences?.weekly_summary_enabled ?? true} onCheckedChange={(checked) => updatePreferences({ weekly_summary_enabled: checked })} disabled={isUpdating} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Canais</h3>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-muted-foreground">Notificações por Email</p>
                <p className="text-sm text-muted-foreground">Em breve — receba alertas importantes por email</p>
              </div>
              <Switch checked={false} disabled />
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-muted-foreground">Notificações Push</p>
                <p className="text-sm text-muted-foreground">Em breve — alertas no dispositivo mesmo com o app fechado</p>
              </div>
              <Switch checked={false} disabled />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
