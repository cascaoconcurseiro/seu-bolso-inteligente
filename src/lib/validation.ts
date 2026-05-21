/**
 * Schemas de Validação com Zod
 * 
 * TASK 2.4: Implementar Validação com Zod
 * Define schemas para validação robusta de entrada em formulários
 */

import { z } from 'zod';

/**
 * Schema para validação de transações
 */
export const TransactionSchema = z.object({
  amount: z
    .number()
    .positive('Valor deve ser maior que zero')
    .finite('Valor deve ser um número válido')
    .refine(
      (val) => val >= 0.01,
      'Valor mínimo é R$ 0,01'
    ),
  
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(255, 'Descrição não pode ter mais de 255 caracteres')
    .refine(
      (val) => val.trim().length > 0,
      'Descrição não pode ser apenas espaços em branco'
    ),
  
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      'Data inválida'
    ),
  
  type: z
    .enum(['EXPENSE', 'INCOME', 'TRANSFER'])
    .refine(
      (val) => ['EXPENSE', 'INCOME', 'TRANSFER'].includes(val),
      'Tipo de transação inválido'
    ),
  
  account_id: z
    .string()
    .uuid('ID da conta inválido')
    .min(1, 'Conta é obrigatória'),
  
  category_id: z
    .string()
    .uuid('ID da categoria inválido')
    .optional()
    .nullable(),
  
  currency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres')
    .default('BRL'),
  
  notes: z
    .string()
    .max(1000, 'Notas não podem ter mais de 1000 caracteres')
    .optional()
    .nullable(),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;

/**
 * Schema para validação de splits
 */
export const SplitSchema = z.object({
  member_id: z
    .string()
    .uuid('ID do membro inválido')
    .min(1, 'Membro é obrigatório'),
  
  percentage: z
    .number()
    .positive('Percentual deve ser maior que zero')
    .max(100, 'Percentual não pode ser maior que 100%')
    .refine(
      (val) => val > 0 && val <= 100,
      'Percentual deve estar entre 0 e 100%'
    ),
  
  amount: z
    .number()
    .positive('Valor deve ser maior que zero')
    .optional(),
});

export type SplitInput = z.infer<typeof SplitSchema>;

/**
 * Schema para validação de múltiplos splits
 */
export const SplitsSchema = z
  .array(SplitSchema)
  .min(1, 'Pelo menos um membro deve ser selecionado')
  .refine(
    (splits) => {
      // Verificar que a soma de percentuais não excede 100%
      const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
      return totalPercentage <= 100.01; // Permitir pequeno erro de arredondamento
    },
    'A soma dos percentuais não pode exceder 100%'
  );

export type SplitsInput = z.infer<typeof SplitsSchema>;

/**
 * Schema para validação de contas
 */
export const AccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da conta é obrigatório')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .refine(
      (val) => val.trim().length > 0,
      'Nome não pode ser apenas espaços em branco'
    ),
  
  type: z
    .enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'EMERGENCY_FUND', 'GLOBAL_ACCOUNT'])
    .refine(
      (val) => ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'EMERGENCY_FUND', 'GLOBAL_ACCOUNT'].includes(val),
      'Tipo de conta inválido'
    ),
  
  balance: z
    .number()
    .finite('Saldo deve ser um número válido')
    .default(0),
  
  currency: z
    .string()
    .length(3, 'Moeda deve ter 3 caracteres')
    .default('BRL'),
  
  bank_id: z
    .string()
    .optional()
    .nullable(),
  
  closing_day: z
    .number()
    .int('Dia de fechamento deve ser um número inteiro')
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31')
    .optional()
    .nullable(),
  
  due_day: z
    .number()
    .int('Dia de vencimento deve ser um número inteiro')
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31')
    .optional()
    .nullable(),
  
  credit_limit: z
    .number()
    .positive('Limite de crédito deve ser maior que zero')
    .optional()
    .nullable(),
});

export type AccountInput = z.infer<typeof AccountSchema>;

/**
 * Schema para validação de settlement (acerto)
 */
export const SettlementSchema = z.object({
  member_id: z
    .string()
    .uuid('ID do membro inválido')
    .min(1, 'Membro é obrigatório'),
  
  account_id: z
    .string()
    .uuid('ID da conta inválido')
    .min(1, 'Conta é obrigatória'),
  
  amount: z
    .number()
    .positive('Valor deve ser maior que zero')
    .finite('Valor deve ser um número válido'),
  
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      'Data inválida'
    ),
  
  type: z
    .enum(['PAY', 'RECEIVE'])
    .refine(
      (val) => ['PAY', 'RECEIVE'].includes(val),
      'Tipo de acerto inválido'
    ),
});

export type SettlementInput = z.infer<typeof SettlementSchema>;

/**
 * Schema para validação de parcelamento
 */
export const InstallmentSchema = z.object({
  total_installments: z
    .number()
    .int('Número de parcelas deve ser um número inteiro')
    .min(2, 'Mínimo de 2 parcelas')
    .max(360, 'Máximo de 360 parcelas'),
  
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      'Data inválida'
    ),
  
  frequency: z
    .enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY'])
    .refine(
      (val) => ['MONTHLY', 'WEEKLY', 'BIWEEKLY'].includes(val),
      'Frequência inválida'
    ),
});

export type InstallmentInput = z.infer<typeof InstallmentSchema>;

/**
 * Função auxiliar para validar dados com tratamento de erro
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Erro ao validar dados' } };
  }
}

/**
 * Função auxiliar para validar e lançar erro
 */
export function validateDataOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
