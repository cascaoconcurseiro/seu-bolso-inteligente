/**
 * SHARED TRANSACTION MANAGER
 * Gerenciador avançado de transações compartilhadas
 * - Cache local
 * - Auto-sync (30s)
 * - Event emitter
 * - Retry automático
 */

import { supabase } from '@/integrations/supabase/client';

interface SharedTransactionData {
  amount: number;
  description: string;
  date: string;
  type: 'EXPENSE' | 'INCOME';
  category_id?: string;
  trip_id?: string;
  sharedWith: Array<{ memberId: string; amount: number; percentage: number }>;
}

interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  retryCount: number;
  maxRetries: number;
}

export class SharedTransactionManager {
  private cache = new Map<string, any>();
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingOperations: PendingOperation[] = [];
  private listeners = new Map<string, Set<Function>>();

  constructor() {
    this.startAutoSync();
    // Não precisa mais carregar do localStorage - dados vêm do banco
  }

  /**
   * Criar transação compartilhada com mirrors
   */
  async createSharedTransaction(data: SharedTransactionData, payerId: string): Promise<any> {
    try {
      // 1. Criar transação original
      const { data: originalTx, error: txError } = await supabase
        .from('transactions')
        .insert({
          amount: data.amount,
          description: data.description,
          date: data.date,
          type: data.type,
          category_id: data.category_id,
          trip_id: data.trip_id,
          domain: data.trip_id ? 'TRAVEL' : 'SHARED',
          is_shared: true,
          payer_id: payerId,
          user_id: payerId,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Criar splits
      const splits = data.sharedWith.map(split => ({
        transaction_id: originalTx.id,
        member_id: split.memberId,
        percentage: split.percentage,
        amount: split.amount,
      }));

      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .insert(splits);

      if (splitsError) throw splitsError;

      // 3. Criar mirrors para cada devedor
      const mirrors = data.sharedWith
        .filter(split => split.memberId !== payerId)
        .map(split => ({
          amount: split.amount,
          description: data.description,
          date: data.date,
          type: 'EXPENSE' as const,
          category_id: data.category_id,
          trip_id: data.trip_id,
          domain: data.trip_id ? 'TRAVEL' : 'SHARED',
          is_shared: true,
          is_mirror: true,
          source_transaction_id: originalTx.id,
          user_id: split.memberId,
        }));

      if (mirrors.length > 0) {
        const { error: mirrorsError } = await supabase
          .from('transactions')
          .insert(mirrors);

        if (mirrorsError) throw mirrorsError;
      }

      // Atualizar cache
      this.cache.set(originalTx.id, originalTx);

      // Emitir evento
      this.emit('transaction:created', originalTx);

      return originalTx;
    } catch (error) {
      console.error('Erro ao criar transação compartilhada:', error);
      
      // Adicionar à fila de retry no banco de dados
      await this.addPendingOperation({
        type: 'CREATE',
        data,
      });

      throw error;
    }
  }

  /**
   * Aceitar/Rejeitar request de compartilhamento
   */
  async respondToRequest(requestId: string, accept: boolean): Promise<void> {
    try {
      const { data: request, error: fetchError } = await supabase
        .from('shared_transaction_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      if (accept) {
        // Criar transação para o usuário
        const { data: transaction } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', request.transaction_id)
          .single();

        if (transaction) {
          await this.createSharedTransaction(
            {
              amount: request.assigned_amount,
              description: transaction.description,
              date: transaction.date,
              type: transaction.type,
              category_id: transaction.category_id,
              trip_id: transaction.trip_id,
              sharedWith: [],
            },
            request.invited_user_id
          );
        }
      }

      // Atualizar status do request
      const { error: updateError } = await supabase
        .from('shared_transaction_requests')
        .update({ 
          status: accept ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      this.emit('request:responded', { requestId, accept });
    } catch (error) {
      console.error('Erro ao responder request:', error);
      throw error;
    }
  }

  /**
   * Sincronizar transações pendentes (SINGLE SOURCE OF TRUTH: Banco de dados)
   */
  private async syncPendingOperations(): Promise<void> {
    try {
      // Buscar operações pendentes do banco de dados
      const { data: operations, error } = await supabase
        .from('pending_operations')
        .select('*')
        .eq('status', 'PENDING')
        .lte('retry_count', supabase.rpc('max_retries'))
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      if (!operations || operations.length === 0) return;

      for (const operation of operations) {
        try {
          // Marcar como processando
          await supabase
            .from('pending_operations')
            .update({ status: 'PROCESSING' })
            .eq('id', operation.id);

          // Executar operação baseado no tipo
          switch (operation.operation_type) {
            case 'CREATE_SPLIT':
              await this.executePendingCreateSplit(operation.payload);
              break;
            case 'MIRROR_TRANSACTION':
              await this.executePendingMirror(operation.payload);
              break;
            // Adicionar outros tipos conforme necessário
          }

          // Marcar como completada
          await supabase
            .from('pending_operations')
            .update({ 
              status: 'COMPLETED',
              completed_at: new Date().toISOString()
            })
            .eq('id', operation.id);

        } catch (error) {
          // Incrementar retry count
          const newRetryCount = operation.retry_count + 1;
          const nextRetryAt = new Date(Date.now() + Math.pow(2, newRetryCount) * 1000); // Exponential backoff

          if (newRetryCount >= operation.max_retries) {
            // Marcar como falhada se excedeu max retries
            await supabase
              .from('pending_operations')
              .update({ 
                status: 'FAILED',
                last_error: error instanceof Error ? error.message : 'Unknown error',
                retry_count: newRetryCount
              })
              .eq('id', operation.id);
            
            console.error('Operação falhou após max retries:', operation);
          } else {
            // Agendar próximo retry
            await supabase
              .from('pending_operations')
              .update({ 
                status: 'PENDING',
                retry_count: newRetryCount,
                next_retry_at: nextRetryAt.toISOString(),
                last_error: error instanceof Error ? error.message : 'Unknown error'
              })
              .eq('id', operation.id);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar operações pendentes:', error);
    }
  }

  /**
   * Executar criação de split pendente
   */
  private async executePendingCreateSplit(payload: any): Promise<void> {
    const { error } = await supabase
      .from('transaction_splits')
      .insert(payload);
    
    if (error) throw error;
  }

  /**
   * Executar espelhamento pendente
   */
  private async executePendingMirror(payload: any): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .insert(payload);
    
    if (error) throw error;
  }

  /**
   * Auto-sync a cada 30 segundos
   */
  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      this.syncPendingOperations();
    }, 30000); // 30 segundos
  }

  /**
   * Parar auto-sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Adicionar operação pendente (SINGLE SOURCE OF TRUTH: Banco de dados)
   */
  private async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'retryCount' | 'maxRetries'>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('pending_operations')
        .insert({
          user_id: user.id,
          operation_type: operation.type === 'CREATE' ? 'CREATE_SPLIT' : 'MIRROR_TRANSACTION',
          payload: operation.data,
          retry_count: 0,
          max_retries: 3,
          status: 'PENDING'
        });
    } catch (error) {
      console.error('Erro ao adicionar operação pendente:', error);
    }
  }

  /**
   * @deprecated Não usa mais localStorage - dados no banco de dados
   */
  private savePendingOperations(): void {
    // Removido - operações agora são salvas no banco de dados
  }

  /**
   * @deprecated Não usa mais localStorage - dados no banco de dados
   */
  private loadPendingOperations(): void {
    // Removido - operações agora são carregadas do banco de dados
  }

  /**
   * Event emitter - registrar listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Event emitter - remover listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Event emitter - emitir evento
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obter do cache
   */
  getFromCache(id: string): any {
    return this.cache.get(id);
  }

  /**
   * Destruir instância
   */
  destroy(): void {
    this.stopAutoSync();
    this.clearCache();
    this.listeners.clear();
  }
}

// Singleton instance
let instance: SharedTransactionManager | null = null;

export function getSharedTransactionManager(): SharedTransactionManager {
  if (!instance) {
    instance = new SharedTransactionManager();
  }
  return instance;
}

export function destroySharedTransactionManager(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
