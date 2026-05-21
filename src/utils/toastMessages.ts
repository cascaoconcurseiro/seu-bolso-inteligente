/**
 * Toast Message Utilities
 * Centralized toast messages to ensure consistency across the app
 */

import { toast } from 'sonner';

/**
 * Transaction toast messages
 */
export const transactionToasts = {
  created: () => toast.success('Transação criada com sucesso!'),
  updated: () => toast.success('Transação atualizada!'),
  deleted: () => toast.success('Transação removida!'),
  seriesDeleted: (count: number) => toast.success(`${count} parcelas removidas com sucesso!`),
  seriesUpdated: (count: number) => toast.success(`${count} parcelas atualizadas!`),
  futureDeleted: (count: number) => toast.success(`${count} parcelas futuras removidas!`),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} transação: ${error.message}`),
};

/**
 * Account toast messages
 */
export const accountToasts = {
  created: () => toast.success('Conta criada com sucesso!'),
  updated: () => toast.success('Conta atualizada!'),
  deleted: () => toast.success('Conta removida!'),
  archived: () => toast.success('Conta arquivada! As transações foram preservadas.'),
  unarchived: () => toast.success('Conta desarquivada com sucesso!'),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} conta: ${error.message}`),
};

/**
 * Budget toast messages
 */
export const budgetToasts = {
  created: () => toast.success('Orçamento criado!'),
  updated: () => toast.success('Orçamento atualizado!'),
  deleted: () => toast.success('Orçamento excluído!'),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} orçamento: ${error.message}`),
};

/**
 * Category toast messages
 */
export const categoryToasts = {
  created: () => toast.success('Categoria criada!'),
  updated: () => toast.success('Categoria atualizada!'),
  deleted: () => toast.success('Categoria removida!'),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} categoria: ${error.message}`),
};

/**
 * Family toast messages
 */
export const familyToasts = {
  memberAdded: () => toast.success('Membro adicionado à família!'),
  memberRemoved: () => toast.success('Membro removido da família!'),
  invitationSent: () => toast.success('Convite enviado!'),
  invitationAccepted: () => toast.success('Convite aceito!'),
  invitationRejected: () => toast.success('Convite rejeitado!'),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action}: ${error.message}`),
};

/**
 * Trip toast messages
 */
export const tripToasts = {
  created: () => toast.success('Viagem criada!'),
  updated: () => toast.success('Viagem atualizada!'),
  deleted: () => toast.success('Viagem removida!'),
  memberAdded: () => toast.success('Membro adicionado à viagem!'),
  memberRemoved: () => toast.success('Membro removido da viagem!'),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} viagem: ${error.message}`),
};

/**
 * Settlement toast messages
 */
export const settlementToasts = {
  confirmed: () => toast.success('Ressarcimento confirmado!'),
  multipleConfirmed: (count: number) => 
    toast.success(`${count} ressarcimento(s) confirmado(s)!`),
  undone: () => toast.success('Ressarcimento desfeito!'),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} ressarcimento: ${error.message}`),
};

/**
 * Goal toast messages
 */
export const goalToasts = {
  created: () => toast.success('Meta criada!'),
  updated: () => toast.success('Meta atualizada!'),
  deleted: () => toast.success('Meta removida!'),
  completed: () => toast.success('🎉 Parabéns! Meta alcançada!'),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} meta: ${error.message}`),
};

/**
 * Alert toast messages
 */
export const alertToasts = {
  created: () => toast.success('Alerta criado!'),
  updated: () => toast.success('Alerta atualizado!'),
  deleted: () => toast.success('Alerta removido!'),
  triggered: (message: string) => toast.warning(message),
  error: (action: string, error: Error) => 
    toast.error(`Erro ao ${action} alerta: ${error.message}`),
};

/**
 * Generic success toast
 */
export const successToast = (message: string) => toast.success(message);

/**
 * Generic error toast
 */
export const errorToast = (message: string, error?: Error) => {
  const fullMessage = error ? `${message}: ${error.message}` : message;
  toast.error(fullMessage);
};

/**
 * Generic info toast
 */
export const infoToast = (message: string) => toast.info(message);

/**
 * Generic warning toast
 */
export const warningToast = (message: string) => toast.warning(message);
