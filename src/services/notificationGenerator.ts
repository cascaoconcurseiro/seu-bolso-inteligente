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
import {
  createNotification,
  createWelcomeNotification,
  createInvoiceDueNotification,
  createBudgetWarningNotification,
  createSharedPendingNotification,
  createRecurringPendingNotification,
  getNotificationPreferences,
} from "./notificationService";
import { checkPendingRecurrences } from "./recurrenceService";

interface GenerationResult {
  invoiceDue: number;
  budgetWarning: number;
  sharedPending: number;
  recurringPending: number;
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
    total: 0,
  };

  try {
    // Buscar preferências do usuário
    const prefs = await getNotificationPreferences(userId);

    // Gerar notificações em paralelo
    const [invoices, budgets, shared, recurring] = await Promise.all([
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
    ]);

    result.invoiceDue = invoices;
    result.budgetWarning = budgets;
    result.sharedPending = shared;
    result.recurringPending = recurring;
    result.total = invoices + budgets + shared + recurring;

    return result;
  } catch (error) {
    console.error('Erro ao gerar notificações:', error);
    return result;
  }
}

/**
 * Gera notificações de faturas próximas do vencimento
 */
async function generateInvoiceDueNotifications(
  userId: string,
  daysBefore: number
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

      // REGRA: Notificar APENAS no dia do FECHAMENTO
      if (todayDay !== closingDay) continue;

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

      console.log(`[Notificação Fatura] Cartão: ${card.name}`);
      console.log(`  Período: ${billingStart.toISOString().split('T')[0]} a ${billingEnd.toISOString().split('T')[0]}`);
      console.log(`  Vencimento: ${dueDate.toISOString().split('T')[0]} (${daysUntilDue} dias)`);

      // Buscar transações da fatura FECHADA
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, date, description')
        .eq('account_id', card.id)
        .eq('type', 'EXPENSE')
        .gte('date', billingStart.toISOString().split('T')[0])
        .lte('date', billingEnd.toISOString().split('T')[0]);

      const invoiceAmount = (transactions || []).reduce((sum, tx) => sum + Number(tx.amount), 0);

      console.log(`  Transações: ${transactions?.length || 0}`);
      console.log(`  Valor total: R$ ${invoiceAmount.toFixed(2)}`);

      // Só notificar se houver valor a pagar
      if (invoiceAmount <= 0) {
        console.log(`  ⚠️ Sem valor a pagar, pulando notificação`);
        continue;
      }

      // Criar identificador único para esta fatura (cartão + mês/ano de vencimento)
      const invoiceKey = `${card.id}_${dueDate.getFullYear()}_${dueDate.getMonth()}`;

      // Verificar se já existe notificação para ESTA FATURA ESPECÍFICA
      const { data: existingNotification } = await (supabase as any)
        .from('notifications')
        .select('id, metadata')
        .eq('user_id', userId)
        .eq('related_id', card.id)
        .eq('related_type', 'credit_card')
        .eq('type', 'INVOICE_DUE')
        .eq('is_dismissed', false)
        .maybeSingle();

      // Se já existe notificação para esta fatura, pular
      if (existingNotification) {
        const metadata = existingNotification.metadata as any;
        if (metadata?.invoice_key === invoiceKey) {
          console.log(`  ⚠️ Notificação já existe para fatura ${invoiceKey}`);
          continue;
        }
      }

      // Criar notificação com metadata para identificar a fatura
      console.log(`  ✅ Criando notificação`);
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
          .gte('created_at', todayStr) // Criada hoje ou depois
          .maybeSingle();

        // Se já existe notificação ativa criada hoje, pular
        if (existingNotification) {
          console.log(`Notificação de fatura já existe hoje para cartão ${card.id}`);
          continue;
        }

        await createInvoiceDueNotification(
          userId,
          card.name,
          card.id,
          invoiceAmount,
          daysUntilDue
        );
        count++;
      }
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
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, category_id, currency')
      .eq('user_id', userId)
      .eq('type', 'EXPENSE')
      .gte('competence_date', startOfMonth.toISOString().split('T')[0]);

    if (txError) return 0;

    // Calcular gastos por categoria e moeda
    const spentByCategory: Record<string, Record<string, number>> = {};

    (transactions || []).forEach((tx: any) => {
      const catId = tx.category_id || 'all';
      const currency = tx.currency || 'BRL';

      if (!spentByCategory[catId]) spentByCategory[catId] = {};
      if (!spentByCategory[catId][currency]) spentByCategory[catId][currency] = 0;

      spentByCategory[catId][currency] += Number(tx.amount);
    });

    // Verificar cada orçamento
    for (const budget of budgets) {
      const catId = budget.category_id || 'all';
      const spent = spentByCategory[catId]?.[budget.currency] || 0;
      const percentage = (spent / budget.amount) * 100;

      // Verificar se já existe notificação não dispensada para este orçamento HOJE
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: existingNotification } = await (supabase as any)
        .from('notifications')
        .select('id, created_date')
        .eq('user_id', userId)
        .eq('related_id', budget.id)
        .eq('related_type', 'budget')
        .eq('is_dismissed', false)
        .gte('created_date', today) // Criada hoje ou depois
        .maybeSingle();

      // Se já existe notificação ativa criada hoje, pular
      if (existingNotification) {
        console.log(`Notificação de orçamento já existe hoje para budget ${budget.id}`);
        continue;
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

    // Filtrar apenas splits onde o usuário é o pagador original
    const userSplits = pendingSplits.filter((split: any) =>
      split.transaction?.user_id === userId
    );

    // Agrupar por membro
    const byMember: Record<string, { name: string; amount: number; count: number }> = {};

    userSplits.forEach((split: any) => {
      const memberId = split.member_id;
      const memberName = split.member?.name || 'Membro';

      if (!byMember[memberId]) {
        byMember[memberId] = { name: memberName, amount: 0, count: 0 };
      }

      byMember[memberId].amount += Number(split.amount);
      byMember[memberId].count++;
    });

    // Criar notificação para cada membro com pendência significativa
    for (const [memberId, data] of Object.entries(byMember)) {
      if (data.amount >= 10) { // Mínimo de R$ 10 para notificar
        // Verificar se já existe notificação não dispensada para este membro HOJE
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { data: existingNotification } = await (supabase as any)
          .from('notifications')
          .select('id, created_at')
          .eq('user_id', userId)
          .eq('related_id', memberId)
          .eq('related_type', 'family_member')
          .eq('type', 'SHARED_PENDING')
          .eq('is_dismissed', false)
          .gte('created_at', today) // Criada hoje ou depois
          .maybeSingle();

        // Se já existe notificação ativa criada hoje, pular
        if (existingNotification) {
          console.log(`Notificação de compartilhado já existe hoje para membro ${memberId}`);
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
      // Verificar se já existe notificação não dispensada HOJE
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: existingNotification } = await (supabase as any)
        .from('notifications')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('type', 'RECURRING_PENDING')
        .eq('is_dismissed', false)
        .gte('created_at', today) // Criada hoje ou depois
        .maybeSingle();

      // Se já existe notificação ativa criada hoje, pular
      if (existingNotification) {
        console.log(`Notificação de recorrência já existe hoje`);
        return 0;
      }

      await createRecurringPendingNotification(userId, pendingCount);
      return 1;
    }
  } catch (error) {
    console.error('Erro ao gerar notificações de recorrência:', error);
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
        console.warn('Tabela notifications não existe ainda');
        return false;
      }
      console.error('Erro ao verificar boas-vindas:', checkError);
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
    console.error('Erro ao verificar boas-vindas:', error);
  }

  return false;
}

/**
 * Dispensa notificações relacionadas a um item específico
 * (ex: quando uma fatura é paga, dispensa a notificação de vencimento)
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
    console.error('Erro ao dispensar notificações relacionadas:', error);
  }
}
