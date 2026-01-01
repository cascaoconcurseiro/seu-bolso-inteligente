import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_KEYWORDS } from '@/lib/categoryKeywords';

export interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0.0 a 1.0
  reason: string;
}

export class CategoryPredictionService {
  
  /**
   * Prediz categoria baseado na descrição
   */
  static async predictCategory(
    description: string,
    userId: string,
    type: 'expense' | 'income'
  ): Promise<CategoryPrediction | null> {
    
    if (!description || description.length < 3) {
      return null;
    }
    
    const normalizedDesc = description.toLowerCase().trim();
    
    // 1. Verificar histórico do usuário (prioridade máxima)
    const userLearning = await this.checkUserLearning(normalizedDesc, userId);
    if (userLearning && userLearning.confidence > 0.7) {
      return userLearning;
    }
    
    // 2. Verificar palavras-chave padrão
    const keywordMatch = await this.matchKeywords(normalizedDesc, userId, type);
    if (keywordMatch) {
      return keywordMatch;
    }
    
    // 3. Verificar transações similares do usuário
    const similarMatch = await this.findSimilarTransactions(normalizedDesc, userId, type);
    if (similarMatch) {
      return similarMatch;
    }
    
    return null;
  }
  
  /**
   * Verifica aprendizado do usuário
   */
  private static async checkUserLearning(
    description: string,
    userId: string
  ): Promise<CategoryPrediction | null> {
    
    try {
      const { data, error } = await supabase
        .from('user_category_learning')
        .select(`
          category_id,
          confidence,
          categories (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .ilike('description_pattern', `%${description}%`)
        .order('confidence', { ascending: false })
        .order('times_used', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data || !data.categories) return null;
      
      return {
        categoryId: data.category_id,
        categoryName: data.categories.name,
        confidence: Number(data.confidence),
        reason: 'Baseado no seu histórico',
      };
    } catch (error) {
      console.error('Erro ao verificar aprendizado:', error);
      return null;
    }
  }
  
  /**
   * Match com palavras-chave padrão
   */
  private static async matchKeywords(
    description: string,
    userId: string,
    type: 'expense' | 'income'
  ): Promise<CategoryPrediction | null> {
    
    try {
      // Buscar categorias do usuário
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, parent_category_id')
        .eq('user_id', userId)
        .eq('type', type)
        .not('parent_category_id', 'is', null); // Apenas subcategorias
      
      if (!categories || categories.length === 0) return null;
      
      let bestMatch: CategoryPrediction | null = null;
      let bestScore = 0;
      
      // Para cada categoria, verificar palavras-chave
      for (const category of categories) {
        const keywords = DEFAULT_KEYWORDS[category.name];
        if (!keywords) continue;
        
        let score = 0;
        let matchedKeyword = '';
        
        for (const keywordGroup of keywords) {
          for (const keyword of keywordGroup.keywords) {
            if (description.includes(keyword)) {
              const currentScore = keywordGroup.weight;
              if (currentScore > score) {
                score = currentScore;
                matchedKeyword = keyword;
              }
            }
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            categoryId: category.id,
            categoryName: category.name,
            confidence: Math.min(score / 10, 1.0),
            reason: `Detectado: "${matchedKeyword}"`,
          };
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.error('Erro ao fazer match de keywords:', error);
      return null;
    }
  }
  
  /**
   * Busca transações similares do usuário
   */
  private static async findSimilarTransactions(
    description: string,
    userId: string,
    type: 'expense' | 'income'
  ): Promise<CategoryPrediction | null> {
    
    try {
      // Pegar primeiras palavras da descrição para busca
      const searchTerm = description.substring(0, 15);
      
      // Buscar transações com descrição similar
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          category_id,
          categories (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .eq('type', type)
        .not('category_id', 'is', null)
        .ilike('description', `%${searchTerm}%`)
        .limit(10);
      
      if (error || !data || data.length === 0) return null;
      
      // Contar categorias mais usadas
      const categoryCount = new Map<string, { id: string, name: string, count: number }>();
      
      for (const tx of data) {
        if (!tx.category_id || !tx.categories) continue;
        
        const key = tx.category_id;
        const existing = categoryCount.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          categoryCount.set(key, {
            id: tx.categories.id,
            name: tx.categories.name,
            count: 1,
          });
        }
      }
      
      // Pegar categoria mais usada
      let mostUsed: { id: string, name: string, count: number } | null = null;
      for (const cat of categoryCount.values()) {
        if (!mostUsed || cat.count > mostUsed.count) {
          mostUsed = cat;
        }
      }
      
      if (!mostUsed) return null;
      
      return {
        categoryId: mostUsed.id,
        categoryName: mostUsed.name,
        confidence: Math.min(mostUsed.count / 5, 0.8),
        reason: `Usado ${mostUsed.count}x em transações similares`,
      };
    } catch (error) {
      console.error('Erro ao buscar transações similares:', error);
      return null;
    }
  }
  
  /**
   * Registra aprendizado quando usuário confirma/corrige categoria
   */
  static async learnFromUser(
    description: string,
    categoryId: string,
    userId: string,
    wasCorrection: boolean
  ): Promise<void> {
    
    if (!description || description.length < 3) return;
    
    const normalizedDesc = description.toLowerCase().trim();
    
    try {
      // Verificar se já existe registro
      const { data: existing } = await supabase
        .from('user_category_learning')
        .select('*')
        .eq('user_id', userId)
        .eq('description_pattern', normalizedDesc)
        .eq('category_id', categoryId)
        .maybeSingle();
      
      if (existing) {
        // Atualizar existente
        const newConfidence = Math.min(Number(existing.confidence) + 0.1, 1.0);
        
        await supabase
          .from('user_category_learning')
          .update({
            times_used: existing.times_used + 1,
            confidence: newConfidence,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Criar novo
        await supabase
          .from('user_category_learning')
          .insert({
            user_id: userId,
            description_pattern: normalizedDesc,
            category_id: categoryId,
            confidence: wasCorrection ? 0.9 : 0.7,
            times_used: 1,
          });
      }
    } catch (error) {
      console.error('Erro ao registrar aprendizado:', error);
    }
  }
}
