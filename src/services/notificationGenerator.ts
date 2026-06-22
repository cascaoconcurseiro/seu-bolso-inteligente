/**
 * Gerador de Notificações Automáticas
 * 
 * Verifica condições do sistema e gera notificações apropriadas:
 * - Faturas próximas do vencimento
 * - Orçamentos em alerta
 * - Despesas compartilhadas pendentes
 * - Transações recorrentes pendentes
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import {
  createWelcomeNotification,
  createInvoiceDueNotification,
  createBudgetWarningNotification,
  createSharedPendingNotification,
  createRecurringPendingNotification,
  getNotificationPreferences,
  createLowBalanceNotification,
  createCreditLimitWarningNotification,
  createGoalMilestoneNotification,
} from "./notificationService";
import { checkPendingRecurrences } from "./recurrenceService";
import { SafeFinancialCalculator } from "./SafeFinancialCalculator";
import { Database } from "@/integrations/supabase/types";

// Type definitions for better type safety
type Account = Database['public']['Tables']['accounts']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type Budget = Database['public']['Tables']['budgets']['Row'];
interface TransactionData {
  amount: number;
  date: string;
  description: string;
}


interface MemberPendingData {
  name: string;
  amount: number;
  count: number;
}

interface SplitWithRelations {
  id: string;
  amount: number;
  member_id: string | null;
  transaction: {
    user_id: string;
    payer_id: string | null;
  } | null;
  member: {
    id: string;
    name: string;
  } | null;
}

interface GenerationResult {
  invoiceDue: number;
  budgetWarning: number;
  sharedPending: number;
  recurringPending: number;
  lowBalance: number;
  creditLimit: number;
  goalMilestone: number;
  total: number;
}

/**
 * Gera todas as notificações pendentes para um usuário
 */
export async function generateAllNotifications(userId: string): Promise<GenerationResult> {
  const result: GenerationResult = {
    invoiceDue: 0,
    budgetWarning: 0,
    sharedPending: 0,
    recurringPending: 0,
    lowBalance: 0,
    creditLimit: 0,
    goalMilestone: 0,
    total: 0,
  };

  try {
    // Buscar preferências do usuário
    const prefs = await getNotificationPreferences(userId);

    // Gerar notificações em paralelo
    const [invoices, budgets, shared, recurring, lowBalance, creditLimit, milestone] = await Promise.all([
      prefs?.invoice_due_enabled !== false
        ? generateInvoiceDueNotifications(userId, prefs?.invoice_due_days_before || 3)
        : 0,
      prefs?.budget_warning_enabled !== false
        ? generateBudgetWarningNotifications(userId, prefs?.budget_warning_threshold || 80)
        : 0,
      prefs?.shared_pending_enabled !== false
        ? generateSharedPendingNotifications(userId)
        : 0,
      prefs?.recurring_enabled !== false
        ? generateRecurringPendingNotifications(userId)
        : 0,
      prefs?.low_balance_enabled !== false
        ? generateLowBalanceNotifications(userId, prefs?.low_balance_threshold || 100)
        : 0,
      prefs?.credit_limit_warning_enabled !== false
        ? generateCreditLimitNotifications(userId, 90) // 90% threshold
        : 0,
      prefs?.savings_goal_enabled !== false
        ? generateGoalMilestoneNotifications(userId)
        : 0,
    ]);

    result.invoiceDue = invoices;
    result.budgetWarning = budgets;
    result.sharedPending = shared;
    result.recurringPending = recurring;
    result.lowBalance = lowBalance || 0;
    result.creditLimit = creditLimit || 0;
    result.goalMilestone = milestone || 0;
    result.total = invoices + budgets + shared + recurring + result.lowBalance + result.creditLimit + result.goalMilestone;

    return result;
  } catch (error) {
    logger.error('Erro ao gerar notificações', error);
    return result;
  }
}

/**
 * Gera notificações de faturas próximas do vencimento
 */
async function generateInvoiceDueNotifications(
  userId: string,
  _daysBefore: number
): Promise<number> {
  let count = 0;

  try {
    // Buscar cartões de crédito ativos
    const { data: cards, error } = await supabase
      .from('accounts')
      .select('id, name, due_day, closing_day')
      .eq('user_id', userId)
      .eq('type', 'CREDIT_CARD')
      .eq('is_active', true);

    if (error || !cards) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDay = today.getDate();

    for (const card of cards) {
      const dueDay = card.due_day || 10;
      const closingDay = card.closing_day || 1;

      // REGRA: Notificar no dia do FECHAMENTO ou no último dia do mês
      // quando o closing_day cadastrado é maior do que os dias do mês atual
      // (ex: fechamento dia 31 em fevereiro → notificar no dia 28/29)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const effectiveClosingDay = Math.min(closingDay, lastDayOfMonth);
      if (todayDay !== effectiveClosingDay) continue;

      // A fatura que FECHOU HOJE vence no próximo mês
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(dueDay);

      // Calcular dias até o vencimento (do fechamento até o vencimento)
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calcular período da fatura que FECHOU HOJE
      // Período: do dia seguinte ao fechamento anterior até hoje (inclusive)
      const billingStart = new Date(today);
      billingStart.setMonth(billingStart.getMonth() - 1);
      billingStart.setDate(closingDay);
      // Adicionar 1 dia ao início (transações começam no dia seguinte ao fechamento)
      billingStart.setDate(billingStart.getDate() + 1);
      
      const billingEnd = new Date(today); // Até hoje (inclusive)

      logger.debug(`Notificação Fatura - Cartão: ${card.name}`);
      logger.debug(`  Período: ${billingStart.toISOString().split('T')[0]} a ${billingEnd.toISOString().split('T')[0]}`);
      logger.debug(`  Vencimento: ${dueDate.toISOString().split('T')[0]} (${daysUntilDue} dias)`);

      // Buscar transações da fatura FECHADA
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, date, description')
        .eq('account_id', card.id)
        .eq('type', 'EXPENSE')
        .gte('date', billingStart.toISOString().split('T')[0])
        .lte('date', billingEnd.toISOString().split('T')[0]);

      const invoiceAmount = SafeFinancialCalculator.safeSum(
        (transactions as TransactionData[] || []).map((tx: TransactionData) => Number(tx.amount))
      );

      logger.debug(`  Transações: ${transactions?.length || 0}`);
      logger.debug(`  Valor total: R$ ${invoiceAmount.toFixed(2)}`);

      // Só notificar se houver valor a pagar
      if (invoiceAmount <= 0) {
        logger.debug(`  Sem valor a pagar, pulando notificação`);
        continue;
      }

      // Definir a chave única da fatura
      const invoiceKey = `${card.id}-${billingEnd.getFullYear()}-${(billingEnd.getMonth() + 1).toString().padStart(2, '0')}`;

      // Verificar se já existe notificação para ESTA FATURA ESPECÍFICA
      const { data: existingNotifications } = await (supabase as any)
        .from('notifications')
        .select('id, metadata')
        .eq('user_id', userId)
        .eq('related_id', card.id)
        .eq('related_type', 'credit_card')
        .eq('type', 'INVOICE_DUE');

      // Se já existe notificação para esta fatura, pular
      if (existingNotifications) {
        const hasExisting = existingNotifications.some((n: any /* any */) => n.metadata?.invoice_key === invoiceKey);
        if (hasExisting) {
          logger.debug(`  Notificação já existe para fatura ${invoiceKey}`);
          continue;
        }
      }

      // Criar notificação com metadata para identificar a fatura
      logger.debug(`  Criando notificação`);
      await createInvoiceDueNotification(
        userId,
        card.name,
        card.id,
        invoiceAmount,
        daysUntilDue,
        invoiceKey
      );
      count++;
    }
  } catch (error) {
    console.error('Erro ao gerar notificações de fatura:', error);
  }

  return count;
}

/**
 * Gera notificações de orçamentos em alerta
 */
async function generateBudgetWarningNotifications(
  userId: string,
  warningThreshold: number
): Promise<number> {
  let count = 0;

  try {
    // Buscar orçamentos ativos
    const { data: budgets, error: budgetError } = await (supabase as any)
      .from('budgets')
      .select('id, name, amount, currency, category_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (budgetError || !budgets || budgets.length === 0) return 0;

    // Buscar transações do mês atual
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, category_id, currency, type, is_refund, exchange_rate')
      .eq('user_id', userId)
      .or('type.eq.EXPENSE,and(type.eq.INCOME,is_refund.eq.true)')
      .gte('competence_date', periodStart.toISOString().split('T')[0]);

    if (txError) return 0;

    const spentByCategory: Record<string, Record<string, number>> = {};

    (transactions as (Transaction & { is_refund: boolean })[] || []).forEach((tx) => {
      const catId = tx.category_id || 'all';
      const txCurrency = tx.currency || 'BRL';
      const amount = Number(tx.amount);
      const isRefund = tx.type === 'INCOME' && tx.is_refund;
      const rate = Number(tx.exchange_rate) || 1.0;

      if (!spentByCategory[catId]) spentByCategory[catId] = {};
      
      // Se for estorno, subtraímos
      const finalAmount = isRefund ? -amount : amount;

      // Armazenar valor nominal na moeda da transação
      if (!spentByCategory[catId][txCurrency]) spentByCategory[catId][txCurrency] = 0;
      spentByCategory[catId][txCurrency] = SafeFinancialCalculator.add(spentByCategory[catId][txCurrency], finalAmount);

      // Se for moeda diferente de BRL, também armazenamos o valor convertido em BRL para orçamentos em BRL
      if (txCurrency !== 'BRL' && rate > 0) {
        if (!spentByCategory[catId]['BRL']) spentByCategory[catId]['BRL'] = 0;
        spentByCategory[catId]['BRL'] = SafeFinancialCalculator.add(spentByCategory[catId]['BRL'], finalAmount * rate);
      }
    });

    // Verificar cada orçamento
    for (const budget of budgets as Budget[]) {
      const catId = budget.category_id || 'all';
      const spent = spentByCategory[catId]?.[budget.currency] || 0;
      const percentage = (spent / budget.amount) * 100;

      // Verificar se já existe notificação para este orçamento NESTE MÊS
      const periodStartStr = periodStart.toISOString().split('T')[0];
      const { data: existingNotification } = await (supabase as any)
        .from('notifications')
        .select('id, created_at, metadata')
        .eq('user_id', userId)
        .eq('related_id', budget.id)
        .eq('related_type', 'budget')
        .gte('created_at', periodStartStr) // Criada neste mês
        .limit(50);

      // Precisamos garantir que não criamos a mesma notificação (ex: 80% já notificado)
      if (existingNotification && existingNotification.length > 0) {
        const isExceeded = percentage >= 100;
        const alreadyNotified = existingNotification.some((n: any /* any */) => 
          (isExceeded && n.metadata?.exceeded === true) || 
          (!isExceeded && n.metadata?.exceeded === false)
        );
        if (alreadyNotified) {
          logger.debug(`Notificação de orçamento já existe este mês para budget ${budget.id}`);
          continue;
        }
      }

      if (percentage >= 100) {
        await createBudgetWarningNotification(
          userId,
          budget.name,
          budget.id,
          percentage,
          true // exceeded
        );
        count++;
      } else if (percentage >= warningThreshold) {
        await createBudgetWarningNotification(
          userId,
          budget.name,
          budget.id,
          percentage,
          false // warning
        );
        count++;
      }
    }
  } catch (error) {
    console.error('Erro ao gerar notificações de orçamento:', error);
  }

  return count;
}

interface PendingSplitItem {
  id: string;
  amount: number;
  member_id: string | null;
  transaction: {
    user_id: string;
    payer_id: string | null;
  } | null;
  member: {
    id: string;
    name: string;
  } | null;
}

/**
 * Gera notificações de despesas compartilhadas pendentes
 */
async function generateSharedPendingNotifications(userId: string): Promise<number> {
  let count = 0;

  try {
    // Buscar splits não acertados onde o usuário é o pagador
    const { data: pendingSplits, error } = await supabase
      .from('transaction_splits')
      .select(`
        id,
        amount,
        member_id,
        transaction:transactions!inner(
          user_id,
          payer_id
        ),
        member:family_members(
          id,
          name
        )
      `)
      .eq('is_settled', false)
      .not('member_id', 'is', null);

    if (error || !pendingSplits) return 0;

    const typedSplits = (pendingSplits as unknown as PendingSplitItem[]) || [];

    // Filtrar apenas splits onde o usuário é o pagador original
    const userSplits = typedSplits.filter((split) =>
      split.transaction?.user_id === userId
    );

    // Agrupar por membro
    const byMember: Record<string, MemberPendingData> = {};

    userSplits.forEach((split) => {
      const memberId = split.member_id;
      if (!memberId) return;
      const memberName = split.member?.name || 'Membro';

      if (!byMember[memberId]) {
        byMember[memberId] = { name: memberName, amount: 0, count: 0 };
      }

      byMember[memberId].amount = SafeFinancialCalculator.add(byMember[memberId].amount, Number(split.amount));
      byMember[memberId].count++;
    });

    // Criar notificação para cada membro com pendência significativa
    for (const [memberId, data] of Object.entries(byMember)) {
      if (data.amount >= 10) { // Mínimo de R$ 10 para notificar
        // Verificar se já existe notificação não dispensada para este membro nos ÚLTIMOS 7 DIAS
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const { data: existingNotification } = await (supabase as any)
          .from('notifications')
          .select('id, created_at, is_dismissed')
          .eq('user_id', userId)
          .eq('related_id', memberId)
          .eq('related_type', 'family_member')
          .eq('type', 'SHARED_PENDING')
          .gte('created_at', sevenDaysAgoStr) // Criada nos últimos 7 dias
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Se já existe notificação recente (ativa ou dispensada nos últimos 7 dias), pular
        if (existingNotification) {
          logger.debug(`Notificação de compartilhado já existe nos últimos 7 dias para membro ${memberId}`);
          continue;
        }

        await createSharedPendingNotification(
          userId,
          data.name,
          memberId,
          data.amount,
          data.count
        );
        count++;
      }
    }
  } catch (error) {
    console.error('Erro ao gerar notificações de compartilhados:', error);
  }

  return count;
}

/**
 * Gera notificação de transações recorrentes pendentes
 */
async function generateRecurringPendingNotifications(userId: string): Promise<number> {
  try {
    const pendingCount = await checkPendingRecurrences(userId);

    if (pendingCount > 0) {
      // Verificar se já existe notificação nos ÚLTIMOS 7 DIAS
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      const { data: existingNotification } = await (supabase as any)
        .from('notifications')
        .select('id, created_at, is_dismissed')
        .eq('user_id', userId)
        .eq('type', 'RECURRING_PENDING')
        .gte('created_at', sevenDaysAgoStr) // Criada nos últimos 7 dias
        .limit(1)
        .maybeSingle();

      // Se já existe notificação recente, pular
      if (existingNotification) {
        logger.debug(`Notificação de recorrência já existe nos últimos 7 dias`);
        return 0;
      }

      await createRecurringPendingNotification(userId, pendingCount);
      return 1;
    }
  } catch (error) {
    logger.error('Erro ao gerar notificações de recorrência', error);
  }

  return 0;
}

/**
 * Verifica se é a primeira vez do usuário e cria notificação de boas-vindas
 */
export async function checkAndCreateWelcomeNotification(
  userId: string,
  userName: string
): Promise<boolean> {
  try {
    // Verificar se já existe notificação de boas-vindas
    const { data: existing, error: checkError } = await (supabase as any)
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'WELCOME')
      .maybeSingle();

    if (checkError) {
      // Se for erro de tabela inexistente, apenas loga e ignora
      if (checkError.code === '42P01') {
        logger.warn('Tabela notifications não existe ainda');
        return false;
      }
      logger.error('Erro ao verificar boas-vindas', checkError);
      return false;
    }

    if (existing) {
      return false; // Já existe
    }

    // Verificar se é usuário novo (sem transações)
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count === 0) {
      await createWelcomeNotification(userId, userName);
      return true;
    }
  } catch (error) {
    logger.error('Erro ao verificar boas-vindas', error);
  }

  return false;
}

/**
 * Gera notificações de saldo baixo
 */
async function generateLowBalanceNotifications(
  userId: string,
  threshold: number
): Promise<number> {
  let count = 0;
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, balance, type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('type', 'CREDIT_CARD');

    if (error || !accounts) return 0;

    for (const acc of accounts) {
      if (acc.balance < threshold) {
        // Verificar se já existe nos ÚLTIMOS 7 DIAS
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const { data: existing } = await (supabase as any)
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('related_id', acc.id)
          .eq('type', 'LOW_BALANCE')
          .gte('created_at', sevenDaysAgoStr)
          .limit(1)
          .maybeSingle();

        if (existing) continue;

        await createLowBalanceNotification(userId, acc.name, acc.id, Number(acc.balance));
        count++;
      }
    }
  } catch (error) {
    logger.error('Erro ao gerar notificações de saldo baixo', error);
  }
  return count;
}

/**
 * Gera notificações de limite de cartão
 */
async function generateCreditLimitNotifications(
  userId: string,
  thresholdPct: number
): Promise<number> {
  let count = 0;
  try {
    const { data: cards, error } = await supabase
      .from('accounts')
      .select('id, name, balance, credit_limit, type')
      .eq('user_id', userId)
      .eq('type', 'CREDIT_CARD')
      .eq('is_active', true);

    if (error || !cards) return 0;

    for (const card of cards) {
      if (!card.credit_limit || card.credit_limit <= 0) continue;

      const spent = Math.abs(Number(card.balance));
      const percentage = (spent / Number(card.credit_limit)) * 100;

      if (percentage >= thresholdPct) {
        // Verificar se já existe nos ÚLTIMOS 7 DIAS
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const { data: existing } = await (supabase as any)
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('related_id', card.id)
          .eq('type', 'CREDIT_LIMIT_WARNING')
          .gte('created_at', sevenDaysAgoStr)
          .limit(1)
          .maybeSingle();

        if (existing) continue;

        await createCreditLimitWarningNotification(userId, card.name, card.id, percentage);
        count++;
      }
    }
  } catch (error) {
    logger.error('Erro ao gerar notificações de limite de cartão', error);
  }
  return count;
}

/**
 * Gera notificações de marcos em metas
 */
async function generateGoalMilestoneNotifications(userId: string): Promise<number> {
  let count = 0;
  try {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('id, name, current_amount, target_amount')
      .eq('user_id', userId)
      .eq('deleted', false)
      .eq('status', 'IN_PROGRESS');

    if (error || !goals) return 0;

    for (const goal of goals) {
      const percentage = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
      
      // Marcos: 50%, 80%, 100%
      let milestone = 0;
      if (percentage >= 100) milestone = 100;
      else if (percentage >= 80) milestone = 80;
      else if (percentage >= 50) milestone = 50;

      if (milestone > 0) {
        // Verificar se já notificamos esse marco
        const { data: existing } = await (supabase as any)
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('related_id', goal.id)
          .eq('type', 'GOAL_MILESTONE')
          .filter('metadata->>milestone', 'eq', milestone.toString())
          .maybeSingle();

        if (existing) continue;

        await createGoalMilestoneNotification(userId, goal.name, goal.id, percentage);
        count++;
      }
    }
  } catch (error) {
    logger.error('Erro ao gerar notificações de metas', error);
  }
  return count;
}

/**
 * Dispensa notificações relacionadas a um item específico
 */
export async function dismissRelatedNotifications(
  userId: string,
  relatedId: string,
  relatedType: string
): Promise<void> {
  try {
    await (supabase as any)
      .from('notifications')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('related_id', relatedId)
      .eq('related_type', relatedType)
      .eq('is_dismissed', false);
  } catch (error) {
    logger.error('Erro ao dispensar notificações relacionadas', error);
  }
}
