/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { UserProfile } from "@/hooks/useUserProfile";

interface NotificationSettingsProps {
  preferences: any;
  isLoading: boolean;
  isUpdating: boolean;
  updatePreferences: (prefs: any) => void;
  profile: UserProfile | null;
  updateProfile: any;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6h a 22h

export function NotificationSettings({
  preferences,
  isLoading,
  isUpdating,
  updatePreferences,
  profile,
  updateProfile,
}: NotificationSettingsProps) {
  const { isSupported, permission, hasSubscription, subscribe, unsubscribe } =
    usePushNotifications();

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

      {/* ── Push no dispositivo ─────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Notificações Push
        </h3>

        <div className="p-4 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertas no Dispositivo</p>
              <p className="text-sm text-muted-foreground">
                {!isSupported
                  ? "Não suportado neste navegador"
                  : permission === "denied"
                    ? "Permissão bloqueada — libere nas configurações do navegador"
                    : hasSubscription
                      ? "Ativo — você receberá alertas mesmo com o app fechado"
                      : "Receba alertas mesmo com o app fechado"}
              </p>
            </div>
            {isSupported && permission !== "denied" ? (
              <Button
                size="sm"
                variant={hasSubscription ? "outline" : "default"}
                onClick={() => (hasSubscription ? unsubscribe.mutate() : subscribe.mutate())}
                disabled={subscribe.isPending || unsubscribe.isPending}
                className="shrink-0"
              >
                {subscribe.isPending || unsubscribe.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : hasSubscription ? (
                  <>
                    <BellOff className="h-4 w-4 mr-1" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-1" />
                    Ativar
                  </>
                )}
              </Button>
            ) : (
              <Switch checked={false} disabled />
            )}
          </div>

          {hasSubscription && (
            <div className="pt-3 border-t space-y-3">
              <div>
                <Label className="text-sm">Horário de envio (horário de Brasília)</Label>
                <Select
                  value={String(preferences?.preferred_hour ?? 8)}
                  onValueChange={(v) => updatePreferences({ preferred_hour: parseInt(v) })}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-40 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  O sistema enviará os lembretes próximo a este horário
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">O que notificar via push</Label>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Contas a vencer</p>
                    <p className="text-xs text-muted-foreground">Transações com data próxima</p>
                  </div>
                  <Switch
                    checked={preferences?.push_bills_enabled ?? true}
                    onCheckedChange={(v) => updatePreferences({ push_bills_enabled: v })}
                    disabled={isUpdating}
                  />
                </div>

                {(preferences?.push_bills_enabled ?? true) && (
                  <div className="pl-2 pb-2">
                    <Label className="text-xs text-muted-foreground">Dias de antecedência</Label>
                    <Select
                      value={String(preferences?.push_days_before ?? 3)}
                      onValueChange={(v) => updatePreferences({ push_days_before: parseInt(v) })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-28 mt-1">
                        <SelectValue />
                      </SelectTrigger>
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

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Metas próximas do prazo</p>
                    <p className="text-xs text-muted-foreground">Metas com vencimento em 7 dias</p>
                  </div>
                  <Switch
                    checked={preferences?.push_goals_enabled ?? true}
                    onCheckedChange={(v) => updatePreferences({ push_goals_enabled: v })}
                    disabled={isUpdating}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Resumo semanal</p>
                    <p className="text-xs text-muted-foreground">
                      Todo domingo: gastos e saldo da semana
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.push_weekly_enabled ?? false}
                    onCheckedChange={(v) => updatePreferences({ push_weekly_enabled: v })}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Alertas in-app ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Cartões de Crédito
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Vencimento de Faturas</p>
              <p className="text-sm text-muted-foreground">
                Alertas {preferences?.invoice_due_days_before || 3} dias antes do vencimento
              </p>
            </div>
            <Switch
              checked={preferences?.invoice_due_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ invoice_due_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
          {preferences?.invoice_due_enabled && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm">Dias de antecedência</Label>
              <Select
                value={String(preferences?.invoice_due_days_before || 3)}
                onValueChange={(v) => updatePreferences({ invoice_due_days_before: parseInt(v) })}
              >
                <SelectTrigger className="w-32 mt-2">
                  <SelectValue />
                </SelectTrigger>
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
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Limite do Cartão</p>
              <p className="text-sm text-muted-foreground">
                Aviso quando o uso ultrapassar o percentual configurado
              </p>
            </div>
            <Switch
              checked={preferences?.credit_limit_warning_enabled ?? true}
              onCheckedChange={(checked) =>
                updatePreferences({ credit_limit_warning_enabled: checked })
              }
              disabled={isUpdating}
            />
          </div>
          {preferences?.credit_limit_warning_enabled !== false && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm">Alerta a partir de</Label>
              <Select
                value={String(preferences?.credit_limit_warning_threshold ?? 90)}
                onValueChange={(v) =>
                  updatePreferences({ credit_limit_warning_threshold: parseInt(v) })
                }
              >
                <SelectTrigger className="w-32 mt-2">
                  <SelectValue />
                </SelectTrigger>
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
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Orçamentos
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertas de Orçamento</p>
              <p className="text-sm text-muted-foreground">
                Aviso quando atingir {preferences?.budget_warning_threshold || 80}% do limite
              </p>
            </div>
            <Switch
              checked={preferences?.budget_warning_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ budget_warning_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
          {preferences?.budget_warning_enabled && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm">Limite de alerta</Label>
              <Select
                value={String(preferences?.budget_warning_threshold || 80)}
                onValueChange={(v) => updatePreferences({ budget_warning_threshold: parseInt(v) })}
              >
                <SelectTrigger className="w-32 mt-2">
                  <SelectValue />
                </SelectTrigger>
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
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Despesas Compartilhadas
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Divisões Pendentes</p>
              <p className="text-sm text-muted-foreground">
                Lembrete de valores a receber de membros
              </p>
            </div>
            <Switch
              checked={preferences?.shared_pending_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ shared_pending_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Transações Recorrentes
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Recorrências Pendentes</p>
              <p className="text-sm text-muted-foreground">
                Aviso quando há transações recorrentes para gerar
              </p>
            </div>
            <Switch
              checked={preferences?.recurring_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ recurring_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Metas e Economia
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Progresso de Metas</p>
              <p className="text-sm text-muted-foreground">
                Atualizações sobre suas metas de economia
              </p>
            </div>
            <Switch
              checked={preferences?.savings_goal_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ savings_goal_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Contas Bancárias
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Saldo Baixo</p>
              <p className="text-sm text-muted-foreground">
                Alerta quando o saldo cair abaixo do limite definido em Preferências
              </p>
            </div>
            <Switch
              checked={preferences?.low_balance_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ low_balance_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Resumos in-app
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Resumo Semanal</p>
              <p className="text-sm text-muted-foreground">
                Relatório semanal das suas finanças no painel
              </p>
            </div>
            <Switch
              checked={preferences?.weekly_summary_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences({ weekly_summary_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Email
        </h3>
        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Relatório Mensal por Email</p>
              <p className="text-sm text-muted-foreground">
                Resumo com receitas, despesas e evolução do patrimônio no dia 1º de cada mês
              </p>
            </div>
            <Switch
              checked={profile?.monthly_report_enabled ?? true}
              onCheckedChange={(checked) =>
                updateProfile.mutate({ monthly_report_enabled: checked })
              }
              disabled={updateProfile.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
