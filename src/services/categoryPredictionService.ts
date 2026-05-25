import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_KEYWORDS, CONCEPT_SYNONYMS, CONCEPT_EMOJIS } from '@/lib/categoryKeywords';
import type { CategoryPrediction } from '@/types/categoryPrediction';

export class CategoryPredictionService {
  
  /**
   * Calcula a distância de Levenshtein entre duas strings para tolerar erros de digitação (Fuzzy Matching)
   */
  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Incrementar ao longo do primeiro parâmetro
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // Incrementar ao longo do segundo parâmetro
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Preencher a matriz
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substituição
            Math.min(
              matrix[i][j - 1] + 1, // inserção
              matrix[i - 1][j] + 1  // deleção
            )
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Higieniza e extrai o padrão de descrição removendo ruídos e lixos transacionais
   */
  public static extractCleanPattern(description: string): string {
    if (!description) return '';
    
    let clean = description.toLowerCase().trim();
    
    // 1. Remover datas nos formatos DD/MM, DD/MM/AAAA, DD-MM-AAAA, DD.MM, etc.
    clean = clean.replace(/\b\d{1,2}[\/\-\.]\d{1,2}([\/\-\.]\d{2,4})?\b/g, '');
    
    // 2. Remover horários nos formatos HH:MM, HHhMM, etc.
    clean = clean.replace(/\b\d{1,2}[h\:]\d{2}\b/g, '');
    
    // 3. Remover sufixos/prefixos transacionais comuns de cartão e adquirentes
    const transactionalGarbage = [
      /\bcompra\s+debito\b/g,
      /\bcompra\s+credito\b/g,
      /\bpg\s*\*\s*/g,
      /\bmp\s*\*\s*/g,
      /\bpicpay\s*\*\s*/g,
      /\brecargapay\s*\*\s*/g,
      /\bebanx\s*\*\s*/g,
      /\bstripe\s*\*\s*/g,
      /\bpag\s*\*\s*/g,
      /\bvisa\s+\d{4}\b/g,
      /\bmastercard\s+\d{4}\b/g,
      /\belo\s+\d{4}\b/g,
      /\bcartao\s+\d{4}\b/g,
      /\bfinal\s+\d{4}\b/g,
      /\bparcela\s+\d{1,2}\/\d{1,2}\b/g,
    ];
    
    transactionalGarbage.forEach(regex => {
      clean = clean.replace(regex, '');
    });
    
    // 4. Remover códigos sequenciais, hashes ou números aleatórios maiores que 3 dígitos
    clean = clean.replace(/\b[a-z0-9\-]{5,}\b/g, '');
    clean = clean.replace(/\b\d{4,}\b/g, '');
    clean = clean.replace(/#\d+\b/g, '');
    
    // 5. Remover caracteres especiais isolados e excesso de espaços
    clean = clean.replace(/[^\w\sÀ-ÿ]/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    
    return clean;
  }

  static async predictCategory(
    description: string,
    userId: string,
    type: 'expense' | 'income' | 'withdrawal' | 'deposit'
  ): Promise<CategoryPrediction | null> {
    if (!description || description.length < 3) {
      return null;
    }
    
    const normalizedDesc = description.toLowerCase().trim();
    
    // Disparar todas as verificações paralelamente para evitar gargalos sequenciais
    const [userLearning, keywordMatch, similarMatch] = await Promise.all([
      this.checkUserLearning(normalizedDesc, userId),
      this.matchKeywords(normalizedDesc, userId, type),
      this.findSimilarTransactions(normalizedDesc, userId, type)
    ]);
    
    // 1. Verificar histórico do usuário (prioridade máxima)
    if (userLearning && userLearning.confidence > 0.6) {
      return userLearning;
    }
    
    // 2. Verificar palavras-chave padrão
    if (keywordMatch) {
      return keywordMatch;
    }
    
    // 3. Verificar transações similares do usuário
    if (similarMatch) {
      return similarMatch;
    }
    
    return null;
  }
  
  /**
   * Verifica aprendizado do usuário em memória com algoritmo de scoring multidimensional
   */
  private static async checkUserLearning(
    description: string,
    userId: string
  ): Promise<CategoryPrediction | null> {
    
    try {
      // Buscar todos os aprendizados do usuário
      const { data, error } = await supabase
        .from('user_category_learning')
        .select(`
          id,
          category_id,
          confidence,
          description_pattern,
          times_used,
          categories (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .limit(200);
      
      if (error || !data || data.length === 0) return null;
      
      const cleanInput = this.extractCleanPattern(description);
      if (!cleanInput) return null;
      
      const cleanInputWords = cleanInput.split(' ');
      
      let bestMatch: any = null;
      let bestScore = 0;
      
      for (const row of data) {
        if (!row.categories || !row.description_pattern) continue;
        
        const cleanPattern = this.extractCleanPattern(row.description_pattern);
        if (!cleanPattern) continue;
        
        let matchQuality = 0; // 0.0 a 1.0
        
        // A. Match Exato
        if (cleanInput === cleanPattern) {
          matchQuality = 1.0;
        } 
        // B. Match de Prefixo
        else if (cleanInput.startsWith(cleanPattern)) {
          matchQuality = 0.9;
        } 
        // C. Match de Substring
        else if (cleanInput.includes(cleanPattern) || cleanPattern.includes(cleanInput)) {
          matchQuality = 0.8;
        }
        // D. Match de Tokens (Palavras)
        else {
          const cleanPatternWords = cleanPattern.split(' ');
          const allPatternWordsInInput = cleanPatternWords.every(pw => 
            cleanInputWords.some(iw => iw === pw || (pw.length >= 4 && this.levenshteinDistance(pw, iw) <= 1))
          );
          
          if (allPatternWordsInInput) {
            matchQuality = 0.75;
          } else {
            // E. Fuzzy match geral da frase inteira para pequenos erros de digitação
            const dist = this.levenshteinDistance(cleanInput, cleanPattern);
            const maxLen = Math.max(cleanInput.length, cleanPattern.length);
            if (dist <= 2 && maxLen > 5) {
              matchQuality = 0.70;
            }
          }
        }
        
        if (matchQuality > 0) {
          // Calcular pontuação final
          // Score = (Qualidade do Match * Confiança Salva) + Bônus de Especificidade + Bônus de Frequência
          const baseWeight = Number(row.confidence) || 0.7;
          const lengthBonus = cleanPattern.length * 0.01; // Dá preferência a padrões mais específicos/longos
          const frequencyBonus = Math.min((row.times_used || 1) * 0.005, 0.05); // Pequena preferência a mais usados
          
          const score = (matchQuality * baseWeight) + lengthBonus + frequencyBonus;
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = row;
          }
        }
      }
      
      if (!bestMatch) return null;
      
      const categoryObj = bestMatch.categories as any;
      
      return {
        categoryId: bestMatch.category_id,
        categoryName: categoryObj?.name || 'Sem categoria',
        confidence: Math.min(Number(bestMatch.confidence), 1.0),
        reason: 'Baseado no seu histórico',
      };
    } catch (error) {
      console.error('Erro ao verificar aprendizado:', error);
      return null;
    }
  }
  
  /**
   * Match com palavras-chave padrão usando mapeamento conceitual e resiliência hierárquica
   */
  private static async matchKeywords(
    description: string,
    userId: string,
    type: 'expense' | 'income' | 'withdrawal' | 'deposit'
  ): Promise<CategoryPrediction | null> {
    const predictionType = (type === 'withdrawal') ? 'expense' : (type === 'deposit') ? 'income' : type;
    
    try {
      // Buscar categorias do usuário
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, icon, parent_category_id')
        .eq('user_id', userId)
        .eq('type', predictionType);
      
      if (!categories || categories.length === 0) return null;
      
      const cleanInput = this.extractCleanPattern(description);
      if (!cleanInput) return null;
      
      const inputWords = cleanInput.split(' ');
      
      let bestConcept: string | null = null;
      let bestKeywordScore = 0;
      let matchedKeyword = '';
      
      // A. Varrer todos os conceitos em DEFAULT_KEYWORDS e achar o de maior afinidade com a descrição
      for (const [concept, keywordGroups] of Object.entries(DEFAULT_KEYWORDS)) {
        for (const group of keywordGroups) {
          for (const keyword of group.keywords) {
            const keywordWords = keyword.split(' ');
            
            // Palavra única: fazemos verificação de token ou fuzzy de 1 erro
            if (keywordWords.length === 1) {
              const kw = keywordWords[0];
              const hasWord = inputWords.some(iw => {
                if (iw === kw) return true;
                return kw.length >= 4 && this.levenshteinDistance(kw, iw) <= 1;
              });
              
              if (hasWord) {
                const currentScore = group.weight;
                if (currentScore > bestKeywordScore) {
                  bestKeywordScore = currentScore;
                  bestConcept = concept;
                  matchedKeyword = keyword;
                }
              }
            } else {
              // Termo composto: verificamos se está contido na string inteira
              if (cleanInput.includes(keyword)) {
                const currentScore = group.weight;
                if (currentScore > bestKeywordScore) {
                  bestKeywordScore = currentScore;
                  bestConcept = concept;
                  matchedKeyword = keyword;
                }
              }
            }
          }
        }
      }
      
      if (!bestConcept) return null;
      
      // B. Casar o conceito vencedor com as categorias reais do usuário (hierarquia + sinônimos + emoji)
      let matchedCategory: any = null;
      let matchTypeScore = 0;
      
      const subcategories = categories.filter(c => c.parent_category_id !== null);
      const parentCategories = categories.filter(c => c.parent_category_id === null);
      const candidates = [...subcategories, ...parentCategories];
      
      const cleanConcept = bestConcept.toLowerCase().trim();
      const synonyms = CONCEPT_SYNONYMS[bestConcept] || [];
      const emojis = CONCEPT_EMOJIS[bestConcept] || [];
      
      for (const category of candidates) {
        const catNameLower = category.name.toLowerCase().trim();
        const catIcon = category.icon;
        
        // 1. Match Exato ou Parcial Direto do Nome (Score: 100 para subcategoria, 95 para pai)
        if (catNameLower === cleanConcept || cleanConcept.includes(catNameLower) || catNameLower.includes(cleanConcept)) {
          const score = category.parent_category_id ? 100 : 95;
          if (score > matchTypeScore) {
            matchTypeScore = score;
            matchedCategory = category;
          }
        }
        
        // 2. Match de Sinônimos Conceituais (Score: 80 para subcategoria, 75 para pai)
        const matchedSynonym = synonyms.find(syn => 
          catNameLower === syn || catNameLower.includes(syn) || syn.includes(catNameLower)
        );
        if (matchedSynonym) {
          const score = category.parent_category_id ? 80 : 75;
          if (score > matchTypeScore) {
            matchTypeScore = score;
            matchedCategory = category;
          }
        }
        
        // 3. Match por Emoji / Pista Visual (Score: 50)
        if (catIcon && emojis.includes(catIcon)) {
          const score = 50;
          if (score > matchTypeScore) {
            matchTypeScore = score;
            matchedCategory = category;
          }
        }
      }
      
      // Fallback: se não mapeou especificamente, tenta verificar se algum pai direto bate com o conceito ou sinônimos
      if (!matchedCategory) {
        for (const parent of parentCategories) {
          const parentNameLower = parent.name.toLowerCase().trim();
          if (parentNameLower === cleanConcept || synonyms.some(syn => parentNameLower.includes(syn))) {
            matchedCategory = parent;
            break;
          }
        }
      }
      
      if (!matchedCategory) return null;
      
      return {
        categoryId: matchedCategory.id,
        categoryName: matchedCategory.name,
        confidence: Math.min(bestKeywordScore / 10, 1.0),
        reason: `Detectado: "${matchedKeyword}"`,
      };
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
    type: 'expense' | 'income' | 'withdrawal' | 'deposit'
  ): Promise<CategoryPrediction | null> {
    const predictionType = (type === 'withdrawal') ? 'expense' : (type === 'deposit') ? 'income' : type;
    
    try {
      const cleanDesc = this.extractCleanPattern(description);
      const searchTerm = cleanDesc ? cleanDesc.substring(0, 15) : description.substring(0, 15);
      if (!searchTerm) return null;
      
      const queryType = predictionType.toUpperCase();
      
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
        .eq('type', queryType as any)
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
   * Registra aprendizado quando o usuário confirma/corrige a categoria sugerida, aplicando limpeza e penalização de concorrentes
   */
  static async learnFromUser(
    description: string,
    categoryId: string,
    userId: string,
    wasCorrection: boolean
  ): Promise<void> {
    
    if (!description || description.length < 3) return;
    
    const cleanPattern = this.extractCleanPattern(description);
    if (!cleanPattern || cleanPattern.length < 3) return;
    
    try {
      // 1. Se foi uma correção, penalizar ou remover padrões antigos/concorrentes do mesmo padrão
      if (wasCorrection) {
        const { data: competitors } = await supabase
          .from('user_category_learning')
          .select('*')
          .eq('user_id', userId)
          .eq('description_pattern', cleanPattern)
          .neq('category_id', categoryId);
        
        if (competitors && competitors.length > 0) {
          for (const comp of competitors) {
            const newConfidence = Number(comp.confidence) - 0.3;
            if (newConfidence <= 0.2) {
              // Deletar concorrência irrelevante
              await supabase
                .from('user_category_learning')
                .delete()
                .eq('id', comp.id);
            } else {
              // Penalizar ativamente a confiança da concorrência
              await supabase
                .from('user_category_learning')
                .update({
                  confidence: Math.max(newConfidence, 0.0),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', comp.id);
            }
          }
        }
      }
      
      // 2. Verificar se já existe registro exato para esse padrão e categoria
      const { data: existing } = await supabase
        .from('user_category_learning')
        .select('*')
        .eq('user_id', userId)
        .eq('description_pattern', cleanPattern)
        .eq('category_id', categoryId)
        .maybeSingle();
      
      if (existing) {
        // Atualizar existente (incrementar times_used e calibrar confiança)
        const increment = wasCorrection ? 0.15 : 0.08;
        const newConfidence = Math.min(Number(existing.confidence) + increment, 1.0);
        
        await supabase
          .from('user_category_learning')
          .update({
            times_used: (existing.times_used || 0) + 1,
            confidence: newConfidence,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Criar novo padrão aprendido
        // Se for correção manual explícita, a confiança inicial é mais agressiva (0.85)
        await supabase
          .from('user_category_learning')
          .insert({
            user_id: userId,
            description_pattern: cleanPattern,
            category_id: categoryId,
            confidence: wasCorrection ? 0.85 : 0.70,
            times_used: 1,
            last_used_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Erro ao registrar aprendizado:', error);
    }
  }
}
