/**
 * Serviço de Notificações
 *
 * Gerencia criação, leitura e dismissal de notificações do sistema.
 * Integra com faturas, orçamentos, despesas compartilhadas, recorrências, etc.
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export type NotificationType =
  | "WELCOME"
  | "INVOICE_DUE"
  | "INVOICE_OVERDUE"
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  | "SHARED_PENDING"
  | "SHARED_SETTLED"
  | "SHARED_EXPENSE"
  | "RECURRING_PENDING"
  | "RECURRING_GENERATED"
  | "SAVINGS_GOAL"
  | "GOAL_MILESTONE"
  | "LOW_BALANCE"
  | "CREDIT_LIMIT_WARNING"
  | "SUBSCRIPTION_REMINDER"
  | "WEEKLY_SUMMARY"
  | "TRIP_INVITE"
  | "FAMILY_INVITE"
  | "SETTLEMENT_REQUEST"
  | "PAYMENT_CONFIRMED"
  | "SETTLEMENT_REJECTED"
  | "SECURITY_ALERT"
  | "GENERAL";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  action_url?: string;
  action_label?: string;
  related_id?: string;
  related_type?: string;
  priority: NotificationPriority;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  invoice_due_enabled: boolean;
  invoice_due_days_before: number;
  budget_warning_enabled: boolean;
  budget_warning_threshold: number;
  shared_pending_enabled: boolean;
  recurring_enabled: boolean;
  savings_goal_enabled: boolean;
  low_balance_enabled?: boolean | null;
  low_balance_threshold?: number | null;
  credit_limit_warning_enabled?: boolean | null;
  weekly_summary_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  action_url?: string;
  action_label?: string;
  related_id?: string;
  related_type?: string;
  priority?: NotificationPriority;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

// ===== CRUD de Notificações =====

/**
 * Busca notificações ativas do usuário (não dispensadas)
 */
export async function getActiveNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Erro ao buscar notificações", error);
    return [];
  }

  return (data || []) as Notification[];
}

/**
 * Busca notificações não lidas
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Erro ao buscar notificações não lidas", error);
    return [];
  }

  return (data || []) as Notification[];
}

/**
 * Conta notificações não lidas
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .eq("is_dismissed", false);

  if (error) {
    logger.error("Erro ao contar notificações", error);
    return 0;
  }

  return count || 0;
}

/**
 * Cria uma nova notificação
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  // Verifica se já existe notificação similar NÃO DISPENSADA (evita duplicatas)
  if (input.related_id && input.type) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", input.user_id)
      .eq("type", input.type)
      .eq("related_id", input.related_id)
      .eq("is_dismissed", false)
      .maybeSingle();

    if (existing) {
      return null; // Já existe ativa, não cria duplicata
    }
  }

  const { error } = await supabase
    .from("notifications")
    .insert({
      ...input,
      metadata: input.metadata as any,
      priority: input.priority || "NORMAL",
    });

  if (error) {
    logger.error("Erro ao criar notificação", error);
    return null;
  }

  return null;
}

/**
 * Marca notificação como lida
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    logger.error("Erro ao marcar como lida", error);
    return false;
  }

  return true;
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    logger.error("Erro ao marcar todas como lidas", error);
    return false;
  }

  return true;
}

/**
 * Dispensa (oculta) uma notificação
 */
export async function dismissNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    logger.error("Erro ao dispensar notificação", error);
    return false;
  }

  return true;
}

/**
 * Dispensa todas as notificações lidas
 */
export async function dismissAllRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", true)
    .eq("is_dismissed", false);

  if (error) {
    logger.error("Erro ao dispensar notificações lidas", error);
    return false;
  }

  return true;
}

/**
 * Deleta notificações antigas (mais de 30 dias e já lidas)
 */
export async function cleanupOldNotifications(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("is_read", true)
    .lt("created_at", thirtyDaysAgo.toISOString())
    .select("id");

  if (error) {
    logger.error("Erro ao limpar notificações antigas", error);
    return 0;
  }

  return data?.length || 0;
}

// ===== Preferências =====

/**
 * Busca preferências de notificação do usuário
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Erro ao buscar preferências", error);
    return null;
  }

  // Se não existe, cria com valores padrão
  if (!data) {
    return createDefaultPreferences(userId);
  }

  return data as NotificationPreferences;
}

/**
 * Cria preferências padrão para novo usuário
 */
async function createDefaultPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    logger.error("Erro ao criar preferências", error);
    return null;
  }

  return data as NotificationPreferences;
}

/**
 * Atualiza preferências de notificação
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<boolean> {
  const { error } = await supabase
    .from("notification_preferences")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    logger.error("Erro ao atualizar preferências", error);
    return false;
  }

  return true;
}

// ===== Helpers para criar notificações específicas =====

/**
 * Cria notificação de boas-vindas
 */
export async function createWelcomeNotification(userId: string, userName: string): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "WELCOME",
    title: `Bem-vindo, ${userName}! 🎉`,
    message: "Comece adicionando suas contas e registrando suas primeiras transações.",
    icon: "👋",
    action_url: "/configuracoes",
    action_label: "Configurar conta",
    priority: "NORMAL",
  });
}

/**
 * Cria notificação de fatura próxima do vencimento
 */
export async function createInvoiceDueNotification(
  userId: string,
  cardName: string,
  cardId: string,
  amount: number,
  daysUntilDue: number,
  invoiceKey?: string
): Promise<void> {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Identificar o ano e mês de referência da fatura a partir do invoiceKey
  let refYear = new Date().getFullYear();
  let refMonth = new Date().getMonth(); // 0-indexed
  let refMonthLabel = months[refMonth];

  if (invoiceKey) {
    const parts = invoiceKey.split("-");
    if (parts.length >= 3) {
      refYear = parseInt(parts[parts.length - 2], 10);
      refMonth = parseInt(parts[parts.length - 1], 10) - 1; // 0-indexed
      if (refMonth >= 0 && refMonth < 12) {
        refMonthLabel = months[refMonth];
      }
    }
  }

  // Determinar o título com base no status do vencimento
  let title = "";
  const isOverdue = daysUntilDue < 0;

  if (isOverdue) {
    const daysOverdue = Math.abs(daysUntilDue);
    title = `🚨 Fatura de ${refMonthLabel} (${cardName}) - VENCIDA há ${daysOverdue} dia${daysOverdue !== 1 ? "s" : ""}`;
  } else if (daysUntilDue === 0) {
    title = `⚠️ Fatura de ${refMonthLabel} (${cardName}) - VENCE HOJE!`;
  } else {
    title = `💳 Fatura de ${refMonthLabel} (${cardName}) - Vence em ${daysUntilDue} dia${daysUntilDue !== 1 ? "s" : ""}`;
  }

  await createNotification({
    user_id: userId,
    type: isOverdue ? "INVOICE_OVERDUE" : "INVOICE_DUE",
    title,
    message: `Valor: ${formatCurrency(amount)}. Não esqueça de pagar!`,
    icon: isOverdue ? "🚨" : "💳",
    action_url: `/cartoes?cardId=${cardId}&month=${refYear}-${String(refMonth + 1).padStart(2, "0")}`,
    action_label: "Ver fatura",
    related_id: cardId,
    related_type: "credit_card",
    priority: isOverdue || daysUntilDue <= 1 ? "HIGH" : "NORMAL",
    metadata: invoiceKey ? { invoice_key: invoiceKey } : undefined,
  });
}

/**
 * Cria notificação de orçamento em alerta
 */
export async function createBudgetWarningNotification(
  userId: string,
  budgetName: string,
  budgetId: string,
  percentage: number,
  isExceeded: boolean
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: isExceeded ? "BUDGET_EXCEEDED" : "BUDGET_WARNING",
    title: isExceeded
      ? `Orçamento "${budgetName}" excedido! 🚨`
      : `Orçamento "${budgetName}" em ${percentage.toFixed(0)}%`,
    message: isExceeded
      ? "Você ultrapassou o limite definido para este orçamento."
      : "Atenção! Você está próximo do limite.",
    icon: isExceeded ? "🚨" : "⚠️",
    action_url: "/orcamentos",
    action_label: "Ver orçamento",
    related_id: budgetId,
    related_type: "budget",
    priority: isExceeded ? "HIGH" : "NORMAL",
    metadata: { exceeded: isExceeded },
  });
}

/**
 * Cria notificação de despesa compartilhada pendente
 */
export async function createSharedPendingNotification(
  userId: string,
  memberName: string,
  memberId: string,
  amount: number,
  itemCount: number
): Promise<void> {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  await createNotification({
    user_id: userId,
    type: "SHARED_PENDING",
    title: `${memberName} te deve ${formatCurrency(amount)}`,
    message: `${itemCount} ${itemCount === 1 ? "item pendente" : "itens pendentes"} de acerto.`,
    icon: "👥",
    action_url: "/compartilhados",
    action_label: "Ver detalhes",
    related_id: memberId,
    related_type: "family_member",
    priority: "NORMAL",
  });
}

/**
 * Cria notificação de transações recorrentes pendentes
 */
export async function createRecurringPendingNotification(
  userId: string,
  count: number
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "RECURRING_PENDING",
    title: `${count} transação(ões) recorrente(s) pendente(s)`,
    message: "Clique para gerar as transações automaticamente.",
    icon: "🔄",
    action_url: "/",
    action_label: "Gerar agora",
    priority: "NORMAL",
  });
}

/**
 * Cria notificação de convite de viagem
 */
export async function createTripInviteNotification(
  userId: string,
  tripName: string,
  tripId: string,
  inviterName: string
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "TRIP_INVITE",
    title: tripName,
    message: `${inviterName} te convidou para "${tripName}".`,
    icon: "✈️",
    action_url: "/viagens",
    action_label: "Ver convite",
    related_id: tripId,
    related_type: "trip",
    priority: "HIGH",
  });
}

/**
 * Cria notificação de convite de família
 */
export async function createFamilyInviteNotification(
  userId: string,
  familyName: string,
  invitationId: string,
  inviterName: string
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "FAMILY_INVITE",
    title: `Convite para família: ${familyName}`,
    message: `${inviterName} te convidou para fazer parte da família.`,
    icon: "👨‍👩‍👧‍👦",
    action_url: "/familia",
    action_label: "Ver convite",
    related_id: invitationId,
    related_type: "family_invitation",
    priority: "HIGH",
  });
}

/**
 * Cria notificação de solicitação de acerto (Devedor -> Credor)
 */
export async function createSettlementRequestNotification(
  userId: string,
  debtorName: string,
  amount: number,
  currency: string,
  splitId: string,
  isCompensated?: boolean
): Promise<void> {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);

  const message = isCompensated
    ? `${debtorName} realizou uma compensação de dívidas e marcou o acerto líquido de ${formatCurrency(amount)} como pago. Por favor, confirme o recebimento.`
    : `${debtorName} marcou um pagamento de ${formatCurrency(amount)} como realizado. Por favor, confirme o recebimento.`;

  await createNotification({
    user_id: userId,
    type: "SETTLEMENT_REQUEST",
    title: "Confirmação de Pagamento",
    message: message,
    icon: "💰",
    action_url: `/compartilhados?confirmSettlement=${splitId}`,
    action_label: "Confirmar",
    related_id: splitId,
    related_type: "transaction_split",
    priority: "HIGH",
  });
}

/**
 * Cria notificação de solicitação de acerto do credor para o devedor confirmar (Credor -> Devedor)
 */
export async function createDebtorSettlementRequestNotification(
  userId: string,
  creditorName: string,
  amount: number,
  currency: string,
  splitIds: string[],
  creditorTxId: string,
  isCompensated?: boolean
): Promise<void> {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);

  const message = isCompensated
    ? `${creditorName} realizou uma compensação de dívidas e informou que você deve transferir o valor líquido de ${formatCurrency(amount)}. Por favor, selecione a conta de onde saiu o dinheiro para confirmar ou recuse o acerto.`
    : `${creditorName} informou que recebeu o acerto de ${formatCurrency(amount)}. Por favor, selecione a conta de onde saiu o dinheiro para confirmar ou recuse o acerto.`;

  await createNotification({
    user_id: userId,
    type: "SETTLEMENT_REQUEST",
    title: "Confirmar Saída de Dinheiro",
    message: message,
    icon: "💰",
    action_url: `/compartilhados?confirmPaymentSplit=${splitIds.join(",")}`,
    action_label: "Confirmar Conta",
    related_id: splitIds[0],
    related_type: "transaction_split",
    priority: "HIGH",
    metadata: {
      is_creditor_initiated: true,
      split_ids: splitIds,
      creditor_tx_id: creditorTxId,
      amount,
      currency,
    },
  });
}

/**
 * Cria notificação de compensação perfeita (zerada)
 */
export async function createPerfectCompensationNotification(
  userId: string,
  userName: string,
  itemCount: number
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "SHARED_SETTLED",
    title: "Dívidas Compensadas",
    message: `${userName} realizou uma compensação perfeita de ${itemCount} despesas mútuas. Os valores se anularam e não há pendências.`,
    icon: "✅",
    action_url: "/compartilhados?tab=history",
    action_label: "Ver Histórico",
    priority: "NORMAL",
  });
}

/**
 * Cria notificação de pagamento confirmado (Credor -> Devedor)
 */
export async function createPaymentConfirmedNotification(
  userId: string,
  creditorName: string
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "PAYMENT_CONFIRMED",
    title: "Pagamento Confirmado",
    message: `${creditorName} confirmou o recebimento do seu pagamento.`,
    icon: "✅",
    action_url: "/compartilhados",
    action_label: "Ver",
    priority: "NORMAL",
  });
}

/**
 * Cria notificação de pagamento rejeitado/desfeito
 */
export async function createSettlementRejectedNotification(
  userId: string,
  userName: string,
  description: string,
  reason?: string
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "SETTLEMENT_REJECTED",
    title: "Acerto Desfeito/Recusado",
    message: `${userName} desfez o acerto da despesa "${description}".${reason ? ` Motivo: ${reason}` : ""}`,
    icon: "❌",
    action_url: "/compartilhados",
    action_label: "Ver",
    priority: "HIGH",
  });
}

/**
 * Cria notificação de saldo baixo
 */
export async function createLowBalanceNotification(
  userId: string,
  accountName: string,
  accountId: string,
  balance: number
): Promise<void> {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  await createNotification({
    user_id: userId,
    type: "LOW_BALANCE",
    title: `Saldo baixo: ${accountName}`,
    message: `Seu saldo atual é de ${formatCurrency(balance)}.`,
    icon: "⚠️",
    action_url: "/",
    action_label: "Ver saldo",
    related_id: accountId,
    related_type: "account",
    priority: "HIGH",
  });
}

/**
 * Cria notificação de limite de crédito
 */
export async function createCreditLimitWarningNotification(
  userId: string,
  cardName: string,
  cardId: string,
  percentage: number
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "CREDIT_LIMIT_WARNING",
    title: `Limite do cartão ${cardName}`,
    message: `Você já usou ${percentage.toFixed(0)}% do limite do seu cartão.`,
    icon: "💳",
    action_url: `/cartoes`,
    action_label: "Ver cartão",
    related_id: cardId,
    related_type: "credit_card",
    priority: "HIGH",
  });
}

/**
 * Cria notificação de marco de meta
 */
export async function createGoalMilestoneNotification(
  userId: string,
  goalName: string,
  goalId: string,
  percentage: number,
  milestone: number
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "GOAL_MILESTONE",
    title: `Meta: ${goalName}`,
    message: `Parabéns! Você alcançou ${percentage.toFixed(0)}% da sua meta!`,
    icon: "🎯",
    action_url: `/metas`,
    action_label: "Ver metas",
    related_id: goalId,
    related_type: "goal",
    priority: "NORMAL",
    metadata: { milestone },
  });
}

// ===== Ícones por tipo =====

export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    WELCOME: "👋",
    INVOICE_DUE: "💳",
    INVOICE_OVERDUE: "🚨",
    BUDGET_WARNING: "⚠️",
    BUDGET_EXCEEDED: "🚨",
    SHARED_PENDING: "👥",
    SHARED_SETTLED: "✅",
    SHARED_EXPENSE: "💸",
    RECURRING_PENDING: "🔄",
    RECURRING_GENERATED: "✅",
    SAVINGS_GOAL: "🎯",
    GOAL_MILESTONE: "🎯",
    LOW_BALANCE: "⚠️",
    CREDIT_LIMIT_WARNING: "💳",
    SUBSCRIPTION_REMINDER: "📅",
    WEEKLY_SUMMARY: "📊",
    TRIP_INVITE: "✈️",
    FAMILY_INVITE: "👨‍👩‍👧‍👦",
    SETTLEMENT_REQUEST: "💰",
    PAYMENT_CONFIRMED: "✅",
    SETTLEMENT_REJECTED: "❌",
    SECURITY_ALERT: "🛡️",
    GENERAL: "📢",
  };

  return icons[type] || "📢";
}

/**
 * Retorna cor do badge por prioridade
 */
export function getPriorityColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    LOW: "bg-muted text-muted-foreground",
    NORMAL: "bg-accent/15 text-accent",
    HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return colors[priority] || colors.NORMAL;
}
