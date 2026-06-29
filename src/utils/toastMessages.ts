/**
 * Toast Message Utilities
 * Centralized toast messages + fullscreen action feedback
 */

import { toast } from "sonner";
import { showActionFeedback } from "@/components/ui/ActionFeedback";

function ok(msg: string) {
  showActionFeedback("success");
  toast.success(msg);
}

function fail(msg: string) {
  showActionFeedback("error");
  toast.error(msg);
}

/**
 * Transaction toast messages
 */
export const transactionToasts = {
  created: () => ok("Transação criada com sucesso!"),
  updated: () => ok("Transação atualizada!"),
  deleted: () => ok("Transação removida!"),
  seriesDeleted: (count: number) => ok(`${count} parcelas removidas com sucesso!`),
  seriesUpdated: (count: number) => ok(`${count} parcelas atualizadas!`),
  futureDeleted: (count: number) => ok(`${count} parcelas futuras removidas!`),
  error: (action: string, error: Error) => fail(`Erro ao ${action} transação: ${error.message}`),
};

export const accountToasts = {
  created: () => ok("Conta criada com sucesso!"),
  updated: () => ok("Conta atualizada!"),
  deleted: () => ok("Conta removida!"),
  archived: () => ok("Conta arquivada! As transações foram preservadas."),
  unarchived: () => ok("Conta desarquivada com sucesso!"),
  error: (action: string, error: Error) => fail(`Erro ao ${action} conta: ${error.message}`),
};

export const budgetToasts = {
  created: () => ok("Orçamento criado!"),
  updated: () => ok("Orçamento atualizado!"),
  deleted: () => ok("Orçamento excluído!"),
  error: (action: string, error: Error) => fail(`Erro ao ${action} orçamento: ${error.message}`),
};

export const categoryToasts = {
  created: () => ok("Categoria criada!"),
  updated: () => ok("Categoria atualizada!"),
  deleted: () => ok("Categoria removida!"),
  error: (action: string, error: Error) => fail(`Erro ao ${action} categoria: ${error.message}`),
};

export const familyToasts = {
  memberAdded: () => ok("Membro adicionado à família!"),
  memberRemoved: () => ok("Membro removido da família!"),
  invitationSent: () => ok("Convite enviado!"),
  invitationAccepted: () => ok("Convite aceito!"),
  invitationRejected: () => ok("Convite rejeitado!"),
  error: (action: string, error: Error) => fail(`Erro ao ${action}: ${error.message}`),
};

export const tripToasts = {
  created: () => ok("Viagem criada!"),
  updated: () => ok("Viagem atualizada!"),
  deleted: () => ok("Viagem removida!"),
  memberAdded: () => ok("Membro adicionado à viagem!"),
  memberRemoved: () => ok("Membro removido da viagem!"),
  error: (action: string, error: Error) => fail(`Erro ao ${action} viagem: ${error.message}`),
};

export const settlementToasts = {
  confirmed: () => ok("Ressarcimento confirmado!"),
  multipleConfirmed: (count: number) => ok(`${count} ressarcimento(s) confirmado(s)!`),
  undone: () => ok("Ressarcimento desfeito!"),
  error: (action: string, error: Error) =>
    fail(`Erro ao ${action} ressarcimento: ${error.message}`),
};

export const goalToasts = {
  created: () => ok("Meta criada!"),
  updated: () => ok("Meta atualizada!"),
  deleted: () => ok("Meta removida!"),
  completed: () => ok("🎉 Parabéns! Meta alcançada!"),
  error: (action: string, error: Error) => fail(`Erro ao ${action} meta: ${error.message}`),
};

export const alertToasts = {
  created: () => ok("Alerta criado!"),
  updated: () => ok("Alerta atualizado!"),
  deleted: () => ok("Alerta removido!"),
  triggered: (message: string) => toast.warning(message),
  error: (action: string, error: Error) => fail(`Erro ao ${action} alerta: ${error.message}`),
};

export const successToast = (message: string) => ok(message);

export const errorToast = (message: string, error?: Error) => {
  const fullMessage = error ? `${message}: ${error.message}` : message;
  fail(fullMessage);
};

/**
 * Generic info toast
 */
export const infoToast = (message: string) => toast.info(message);

/**
 * Generic warning toast
 */
export const warningToast = (message: string) => toast.warning(message);
