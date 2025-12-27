/**
 * SHARED TRANSACTION MANAGER
 * Gerenciador avançado de transações compartilhadas
 * - Cache local
 * - Auto-sync (30s)
 * - Event emitter
 * - Retry automático
 */

import { supabase } from '@/lib/supabase';

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
    this.loadPendingOperations();
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
      
      // Adicionar à fila de retry
      this.addPendingOperation({
        id: crypto.randomUUID(),
        type: 'CREATE',
        data,
        retryCount: 0,
        maxRetries: 3,
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
   * Sincronizar transações pendentes
   */
  private async syncPendingOperations(): Promise<void> {
    if (this.pendingOperations.length === 0) return;

    const operations = [...this.pendingOperations];
    
    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'CREATE':
            await this.createSharedTransaction(operation.data, operation.data.payerId);
            break;
          // Adicionar outros tipos conforme necessário
        }

        // Remover da fila se sucesso
        this.pendingOperations = this.pendingOperations.filter(op => op.id !== operation.id);
        
        // Salvar no localStorage
        this.savePendingOperations();
      } catch (error) {
        // Incrementar retry count
        operation.retryCount++;
        
        if (operation.retryCount >= operation.maxRetries) {
          // Remover se excedeu max retries
          this.pendingOperations = this.pendingOperations.filter(op => op.id !== operation.id);
          console.error('Operação falhou após max retries:', operation);
        }
        
        this.savePendingOperations();
      }
    }
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
   * Adicionar operação pendente
   */
  private addPendingOperation(operation: PendingOperation): void {
    this.pendingOperations.push(operation);
    this.savePendingOperations();
  }

  /**
   * Salvar operações pendentes no localStorage
   */
  private savePendingOperations(): void {
    try {
      localStorage.setItem(
        'shared_pending_operations',
        JSON.stringify(this.pendingOperations)
      );
    } catch (error) {
      console.error('Erro ao salvar operações pendentes:', error);
    }
  }

  /**
   * Carregar operações pendentes do localStorage
   */
  private loadPendingOperations(): void {
    try {
      const stored = localStorage.getItem('shared_pending_operations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar operações pendentes:', error);
    }
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
