/**
 * Serviço de Notificações
 * 
 * Gerencia criação, leitura e dismissal de notificações do sistema.
 * Integra com faturas, orçamentos, despesas compartilhadas, recorrências, etc.
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export type NotificationType =
  | 'WELCOME'
  | 'INVOICE_DUE'
  | 'INVOICE_OVERDUE'
  | 'BUDGET_WARNING'
  | 'BUDGET_EXCEEDED'
  | 'SHARED_PENDING'
  | 'SHARED_SETTLED'
  | 'SHARED_EXPENSE'
  | 'RECURRING_PENDING'
  | 'RECURRING_GENERATED'
  | 'SAVINGS_GOAL'
  | 'WEEKLY_SUMMARY'
  | 'TRIP_INVITE'
  | 'FAMILY_INVITE'
  | 'GENERAL';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

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
}

// ===== CRUD de Notificações =====

/**
 * Busca notificações ativas do usuário (não dispensadas)
 */
export async function getActiveNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Erro ao buscar notificações', error);
    return [];
  }

  return data || [];
}

/**
 * Busca notificações não lidas
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Erro ao buscar notificações não lidas', error);
    return [];
  }

  return data || [];
}

/**
 * Conta notificações não lidas
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .eq('is_dismissed', false);

  if (error) {
    logger.error('Erro ao contar notificações', error);
    return 0;
  }

  return count || 0;
}

/**
 * Cria uma nova notificação
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification | null> {
  // Verifica se já existe notificação similar não dispensada (evita duplicatas)
  if (input.related_id && input.type) {
    const { data: existing } = await (supabase as any)
      .from('notifications')
      .select('id')
      .eq('user_id', input.user_id)
      .eq('type', input.type)
      .eq('related_id', input.related_id)
      .eq('is_dismissed', false)
      .maybeSingle();

    if (existing) {
      return null; // Já existe, não cria duplicata
    }
  }

  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert({
      ...input,
      priority: input.priority || 'NORMAL',
    })
    .select()
    .single();

  if (error) {
    logger.error('Erro ao criar notificação', error);
    return null;
  }

  return data;
}

/**
 * Marca notificação como lida
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) {
    logger.error('Erro ao marcar como lida', error);
    return false;
  }

  return true;
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    logger.error('Erro ao marcar todas como lidas', error);
    return false;
  }

  return true;
}

/**
 * Dispensa (oculta) uma notificação
 */
export async function dismissNotification(notificationId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('notifications')
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) {
    logger.error('Erro ao dispensar notificação', error);
    return false;
  }

  return true;
}

/**
 * Dispensa todas as notificações lidas
 */
export async function dismissAllRead(userId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('notifications')
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', true)
    .eq('is_dismissed', false);

  if (error) {
    logger.error('Erro ao dispensar notificações lidas', error);
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

  const { data, error } = await (supabase as any)
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true)
    .lt('created_at', thirtyDaysAgo.toISOString())
    .select('id');

  if (error) {
    logger.error('Erro ao limpar notificações antigas', error);
    return 0;
  }

  return data?.length || 0;
}

// ===== Preferências =====

/**
 * Busca preferências de notificação do usuário
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await (supabase as any)
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('Erro ao buscar preferências', error);
    return null;
  }

  // Se não existe, cria com valores padrão
  if (!data) {
    return createDefaultPreferences(userId);
  }

  return data;
}

/**
 * Cria preferências padrão para novo usuário
 */
async function createDefaultPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await (supabase as any)
    .from('notification_preferences')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    logger.error('Erro ao criar preferências', error);
    return null;
  }

  return data;
}

/**
 * Atualiza preferências de notificação
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('notification_preferences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    logger.error('Erro ao atualizar preferências', error);
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
    type: 'WELCOME',
    title: `Bem-vindo, ${userName}! 🎉`,
    message: 'Comece adicionando suas contas e registrando suas primeiras transações.',
    icon: '👋',
    action_url: '/configuracoes',
    action_label: 'Configurar conta',
    priority: 'NORMAL',
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
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  await createNotification({
    user_id: userId,
    type: 'INVOICE_DUE',
    title: `Fatura ${cardName} vence em ${daysUntilDue} dia${daysUntilDue !== 1 ? 's' : ''}`,
    message: `Valor: ${formatCurrency(amount)}. Não esqueça de pagar!`,
    icon: '💳',
    action_url: '/cartoes',
    action_label: 'Ver fatura',
    related_id: cardId,
    related_type: 'credit_card',
    priority: daysUntilDue <= 1 ? 'HIGH' : 'NORMAL',
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
    type: isExceeded ? 'BUDGET_EXCEEDED' : 'BUDGET_WARNING',
    title: isExceeded
      ? `Orçamento "${budgetName}" excedido! 🚨`
      : `Orçamento "${budgetName}" em ${percentage.toFixed(0)}%`,
    message: isExceeded
      ? 'Você ultrapassou o limite definido para este orçamento.'
      : 'Atenção! Você está próximo do limite.',
    icon: isExceeded ? '🚨' : '⚠️',
    action_url: '/orcamentos',
    action_label: 'Ver orçamento',
    related_id: budgetId,
    related_type: 'budget',
    priority: isExceeded ? 'HIGH' : 'NORMAL',
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
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  await createNotification({
    user_id: userId,
    type: 'SHARED_PENDING',
    title: `${memberName} te deve ${formatCurrency(amount)}`,
    message: `${itemCount} ${itemCount === 1 ? 'item pendente' : 'itens pendentes'} de acerto.`,
    icon: '👥',
    action_url: '/compartilhados',
    action_label: 'Ver detalhes',
    related_id: memberId,
    related_type: 'family_member',
    priority: 'NORMAL',
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
    type: 'RECURRING_PENDING',
    title: `${count} transação(ões) recorrente(s) pendente(s)`,
    message: 'Clique para gerar as transações automaticamente.',
    icon: '🔄',
    action_url: '/',
    action_label: 'Gerar agora',
    priority: 'NORMAL',
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
    type: 'TRIP_INVITE',
    title: `Convite para viagem: ${tripName}`,
    message: `${inviterName} te convidou para participar desta viagem.`,
    icon: '✈️',
    action_url: '/viagens',
    action_label: 'Ver convite',
    related_id: tripId,
    related_type: 'trip',
    priority: 'HIGH',
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
    type: 'FAMILY_INVITE',
    title: `Convite para família: ${familyName}`,
    message: `${inviterName} te convidou para fazer parte da família.`,
    icon: '👨‍👩‍👧‍👦',
    action_url: '/familia',
    action_label: 'Ver convite',
    related_id: invitationId,
    related_type: 'family_invitation',
    priority: 'HIGH',
  });
}

// ===== Ícones por tipo =====

export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    WELCOME: '👋',
    INVOICE_DUE: '💳',
    INVOICE_OVERDUE: '🚨',
    BUDGET_WARNING: '⚠️',
    BUDGET_EXCEEDED: '🚨',
    SHARED_PENDING: '👥',
    SHARED_SETTLED: '✅',
    RECURRING_PENDING: '🔄',
    RECURRING_GENERATED: '✅',
    SAVINGS_GOAL: '🎯',
    WEEKLY_SUMMARY: '📊',
    TRIP_INVITE: '✈️',
    FAMILY_INVITE: '👨‍👩‍👧‍👦',
    GENERAL: '📢',
  };

  return icons[type] || '📢';
}

/**
 * Retorna cor do badge por prioridade
 */
export function getPriorityColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    LOW: 'bg-muted text-muted-foreground',
    NORMAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return colors[priority] || colors.NORMAL;
}
