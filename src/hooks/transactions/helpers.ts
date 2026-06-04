import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

/**
 * Valida que o payer_id existe na tabela family_members
 * 
 * **Validates: Requirements 1.3**
 * 
 * @param payerId - ID do pagador (membro da família)
 * @returns true se válido, lança erro se inválido
 * @throws Error com mensagem descritiva se payer_id não existe
 */
export async function validatePayerId(payerId: string | null | undefined): Promise<boolean> {
  // Campo opcional - se não fornecido, validação passa
  if (!payerId) {
    return true;
  }

  try {
    // 1. Verificar na tabela family_members (por id ou por linked_user_id)
    const { data: payerExists, error: payerCheckError } = await supabase
      .from('family_members')
      .select('id')
      .or(`id.eq.${payerId},linked_user_id.eq.${payerId}`)
      .maybeSingle();
    
    if (payerCheckError) {
      logger.error('Erro ao validar payer_id em family_members:', { payer_id: payerId, error: payerCheckError });
      throw new Error('Erro ao validar pagador. Tente novamente.');
    }

    if (payerExists) {
      return true;
    }

    // 2. Se não estiver na família, verificar se existe na tabela profiles (caso seja id de viagem)
    const { data: profileExists, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', payerId)
      .maybeSingle();

    if (profileCheckError) {
      logger.error('Erro ao validar payer_id em profiles:', { payer_id: payerId, error: profileCheckError });
      throw new Error('Erro ao validar pagador. Tente novamente.');
    }

    if (profileExists) {
      return true;
    }

    logger.warn('Payer ID inválido:', { payer_id: payerId });
    throw new Error('O pagador selecionado é inválido ou não foi encontrado.');
  } catch (error) {
    if (error instanceof Error && (error.message.includes('O pagador selecionado') || error.message.includes('Erro ao validar'))) {
      throw error;
    }
    logger.error('Erro inesperado ao validar payer_id:', error);
    throw new Error('O pagador selecionado é inválido ou não foi encontrado.');
  }
}

/**
 * Valida que um member_id existe em family_members ou profiles
 * 
 * TASK 2.3: Validar Member_ID Antes de Criar Splits
 * Garante que member_id é válido ANTES de criar splits
 * 
 * @param memberId - ID do membro a validar
 * @returns true se válido
 * @throws Error se inválido
 */
export async function validateMemberId(memberId: string | null | undefined): Promise<boolean> {
  // Campo opcional - se não fornecido, validação passa
  if (!memberId) {
    return true;
  }

  try {
    // 1. Verificar na tabela family_members (por id ou por linked_user_id)
    const { data: memberExists, error: memberCheckError } = await supabase
      .from('family_members')
      .select('id')
      .or(`id.eq.${memberId},linked_user_id.eq.${memberId}`)
      .maybeSingle();
    
    if (memberCheckError) {
      logger.error('Erro ao validar member_id em family_members:', { member_id: memberId, error: memberCheckError });
      throw new Error('Erro ao validar membro. Tente novamente.');
    }

    if (memberExists) {
      return true;
    }

    // 2. Se não estiver na família, verificar se existe na tabela profiles (caso seja id de viagem)
    const { data: profileExists, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', memberId)
      .maybeSingle();

    if (profileCheckError) {
      logger.error('Erro ao validar member_id em profiles:', { member_id: memberId, error: profileCheckError });
      throw new Error('Erro ao validar membro. Tente novamente.');
    }

    if (profileExists) {
      return true;
    }

    logger.warn('Member ID inválido:', { member_id: memberId });
    throw new Error('O membro selecionado é inválido ou não foi encontrado.');
  } catch (error) {
    if (error instanceof Error && (error.message.includes('O membro selecionado') || error.message.includes('Erro ao validar'))) {
      throw error;
    }
    logger.error('Erro inesperado ao validar member_id:', error);
    throw new Error('O membro selecionado é inválido ou não foi encontrado.');
  }
}
