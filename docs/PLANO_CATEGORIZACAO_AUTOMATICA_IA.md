# Plano de Implementação: Categorização Automática com IA

## 📋 Visão Geral

Sistema inteligente que sugere categorias automaticamente baseado na descrição da transação, permitindo que o usuário aceite ou corrija a sugestão. O sistema aprende com as correções do usuário.

---

## 🎯 Objetivos

1. **Sugerir categoria automaticamente** ao digitar descrição
2. **Permitir correção** fácil pelo usuário
3. **Aprender com correções** (machine learning personalizado)
4. **Melhorar com o tempo** baseado no histórico do usuário

---

## 🏗️ Arquitetura

### Opção 1: IA Local (Simples e Rápida) ⭐ RECOMENDADA
**Vantagens:**
- Sem custo adicional
- Resposta instantânea
- Privacidade total (dados não saem do sistema)
- Funciona offline

**Como funciona:**
1. **Dicionário de palavras-chave** por categoria
2. **Histórico do usuário** (aprendizado personalizado)
3. **Algoritmo de matching** simples mas eficaz

### Opção 2: IA com API Externa (OpenAI/Anthropic)
**Vantagens:**
- Mais inteligente
- Entende contexto complexo
- Menos manutenção

**Desvantagens:**
- Custo por requisição
- Latência de rede
- Requer API key
- Dados enviados para terceiros

---

## 📐 Implementação Detalhada (Opção 1 - Recomendada)

### 1. Estrutura de Dados

#### Tabela: `category_keywords` (Nova)
```sql
CREATE TABLE category_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  weight INTEGER DEFAULT 1, -- Peso da palavra-chave (1-10)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX idx_category_keywords_keyword ON category_keywords(keyword);
```

#### Tabela: `user_category_learning` (Nova)
```sql
CREATE TABLE user_category_learning (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description_pattern TEXT NOT NULL, -- Padrão da descrição
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) DEFAULT 1.0, -- 0.0 a 1.0
  times_used INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_learning_user ON user_category_learning(user_id);
CREATE INDEX idx_user_learning_pattern ON user_category_learning(description_pattern);
```

### 2. Dicionário de Palavras-Chave Padrão

```typescript
// src/lib/categoryKeywords.ts

export const DEFAULT_KEYWORDS: Record<string, { keywords: string[], weight: number }[]> = {
  // ALIMENTAÇÃO
  'Supermercado': [
    { keywords: ['supermercado', 'mercado', 'extra', 'carrefour', 'pão de açúcar'], weight: 10 },
    { keywords: ['compras', 'feira'], weight: 5 },
  ],
  'Restaurante': [
    { keywords: ['restaurante', 'lanchonete', 'pizzaria', 'churrascaria'], weight: 10 },
    { keywords: ['almoço', 'jantar', 'refeição'], weight: 7 },
  ],
  'Delivery': [
    { keywords: ['ifood', 'rappi', 'uber eats', 'delivery'], weight: 10 },
    { keywords: ['entrega', 'pedido'], weight: 5 },
  ],
  'Café': [
    { keywords: ['starbucks', 'café', 'cafeteria'], weight: 10 },
  ],
  
  // TRANSPORTE
  'Combustível': [
    { keywords: ['posto', 'gasolina', 'etanol', 'diesel', 'combustível'], weight: 10 },
    { keywords: ['shell', 'ipiranga', 'petrobras'], weight: 8 },
  ],
  'Uber/Taxi': [
    { keywords: ['uber', 'taxi', '99', 'cabify'], weight: 10 },
    { keywords: ['corrida', 'viagem'], weight: 3 },
  ],
  'Estacionamento': [
    { keywords: ['estacionamento', 'parking', 'zona azul'], weight: 10 },
  ],
  
  // MORADIA
  'Aluguel': [
    { keywords: ['aluguel', 'rent'], weight: 10 },
  ],
  'Luz': [
    { keywords: ['luz', 'energia', 'enel', 'cemig', 'copel'], weight: 10 },
  ],
  'Água': [
    { keywords: ['água', 'sabesp', 'saneamento'], weight: 10 },
  ],
  'Internet': [
    { keywords: ['internet', 'vivo fibra', 'claro', 'oi', 'tim'], weight: 10 },
  ],
  
  // SAÚDE
  'Farmácia': [
    { keywords: ['farmácia', 'drogaria', 'droga raia', 'pacheco'], weight: 10 },
    { keywords: ['remédio', 'medicamento'], weight: 7 },
  ],
  'Médico': [
    { keywords: ['médico', 'consulta', 'clínica'], weight: 10 },
  ],
  
  // LAZER
  'Cinema': [
    { keywords: ['cinema', 'cinemark', 'ingresso'], weight: 10 },
  ],
  'Academia': [
    { keywords: ['academia', 'smartfit', 'bodytech'], weight: 10 },
  ],
  
  // STREAMING
  'Netflix': [
    { keywords: ['netflix'], weight: 10 },
  ],
  'Spotify': [
    { keywords: ['spotify'], weight: 10 },
  ],
  
  // ... adicionar mais categorias
};
```

### 3. Serviço de Categorização

```typescript
// src/services/categoryPredictionService.ts

import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_KEYWORDS } from '@/lib/categoryKeywords';

interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0.0 a 1.0
  reason: string; // Por que foi sugerida
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
      .single();
    
    if (error || !data) return null;
    
    return {
      categoryId: data.category_id,
      categoryName: data.categories.name,
      confidence: data.confidence,
      reason: 'Baseado no seu histórico',
    };
  }
  
  /**
   * Match com palavras-chave padrão
   */
  private static async matchKeywords(
    description: string,
    userId: string,
    type: 'expense' | 'income'
  ): Promise<CategoryPrediction | null> {
    
    // Buscar categorias do usuário
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, parent_category_id')
      .eq('user_id', userId)
      .eq('type', type);
    
    if (!categories) return null;
    
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
  }
  
  /**
   * Busca transações similares do usuário
   */
  private static async findSimilarTransactions(
    description: string,
    userId: string,
    type: 'expense' | 'income'
  ): Promise<CategoryPrediction | null> {
    
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
      .ilike('description', `%${description.substring(0, 10)}%`)
      .limit(5);
    
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
  }
  
  /**
   * Registra aprendizado quando usuário corrige/confirma categoria
   */
  static async learnFromUser(
    description: string,
    categoryId: string,
    userId: string,
    wasCorrection: boolean
  ): Promise<void> {
    
    const normalizedDesc = description.toLowerCase().trim();
    
    // Verificar se já existe registro
    const { data: existing } = await supabase
      .from('user_category_learning')
      .select('*')
      .eq('user_id', userId)
      .eq('description_pattern', normalizedDesc)
      .eq('category_id', categoryId)
      .single();
    
    if (existing) {
      // Atualizar existente
      await supabase
        .from('user_category_learning')
        .update({
          times_used: existing.times_used + 1,
          confidence: Math.min(existing.confidence + 0.1, 1.0),
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
  }
}
```

### 4. Hook React

```typescript
// src/hooks/useCategoryPrediction.ts

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryPredictionService } from '@/services/categoryPredictionService';
import { useDebounce } from '@/hooks/useDebounce';

interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason: string;
}

export function useCategoryPrediction(
  description: string,
  type: 'expense' | 'income'
) {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<CategoryPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounce para não fazer requisição a cada tecla
  const debouncedDescription = useDebounce(description, 500);
  
  useEffect(() => {
    if (!user || !debouncedDescription || debouncedDescription.length < 3) {
      setPrediction(null);
      return;
    }
    
    const predict = async () => {
      setIsLoading(true);
      try {
        const result = await CategoryPredictionService.predictCategory(
          debouncedDescription,
          user.id,
          type
        );
        setPrediction(result);
      } catch (error) {
        console.error('Erro ao predizer categoria:', error);
        setPrediction(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    predict();
  }, [debouncedDescription, user, type]);
  
  return { prediction, isLoading };
}
```

### 5. UI no TransactionForm

```typescript
// Adicionar no TransactionForm.tsx

const { prediction, isLoading: isPredicting } = useCategoryPrediction(description, activeTab);

// Aplicar sugestão automaticamente (mas permitir mudança)
useEffect(() => {
  if (prediction && !categoryId) {
    setCategoryId(prediction.categoryId);
  }
}, [prediction]);

// No JSX, mostrar badge de sugestão
{prediction && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Badge variant="secondary" className="gap-1">
      <Sparkles className="h-3 w-3" />
      Sugestão: {prediction.categoryName}
      <span className="text-[10px]">
        ({Math.round(prediction.confidence * 100)}% confiança)
      </span>
    </Badge>
    <span className="text-[10px]">{prediction.reason}</span>
  </div>
)}
```

### 6. Aprendizado ao Salvar

```typescript
// No handleSubmit do TransactionForm

// Após salvar transação com sucesso
if (categoryId) {
  const wasCorrection = prediction && prediction.categoryId !== categoryId;
  await CategoryPredictionService.learnFromUser(
    description,
    categoryId,
    user.id,
    wasCorrection
  );
}
```

---

## 🎨 UX/UI

### Fluxo do Usuário:

1. **Usuário digita descrição**: "Uber para o trabalho"
2. **Sistema sugere automaticamente**: 
   - Badge aparece: "✨ Sugestão: Uber/Taxi (95% confiança)"
   - Campo de categoria é preenchido automaticamente
3. **Usuário pode**:
   - ✅ Aceitar (não fazer nada, já está selecionado)
   - ✏️ Corrigir (mudar para outra categoria)
   - ❌ Remover (limpar categoria)
4. **Sistema aprende**:
   - Se aceitar: aumenta confiança
   - Se corrigir: aprende nova associação

---

## 📊 Métricas de Sucesso

1. **Taxa de aceitação**: % de sugestões aceitas
2. **Tempo economizado**: Tempo médio para categorizar
3. **Precisão**: % de sugestões corretas
4. **Aprendizado**: Melhoria da precisão ao longo do tempo

---

## 🚀 Roadmap de Implementação

### Fase 1: MVP (1-2 dias)
- [ ] Criar tabelas no banco
- [ ] Implementar serviço básico com palavras-chave
- [ ] Criar hook React
- [ ] Integrar no TransactionForm
- [ ] Testar com usuários

### Fase 2: Aprendizado (1 dia)
- [ ] Implementar sistema de learning
- [ ] Adicionar histórico de transações similares
- [ ] Melhorar algoritmo de matching

### Fase 3: Refinamento (1 dia)
- [ ] Adicionar mais palavras-chave
- [ ] Melhorar UX/UI
- [ ] Adicionar analytics
- [ ] Otimizar performance

### Fase 4: Avançado (Futuro)
- [ ] Integração com IA externa (opcional)
- [ ] Categorização em lote
- [ ] Sugestões de subcategorias
- [ ] Export/import de aprendizado

---

## 💡 Melhorias Futuras

1. **Categorização em Lote**: Categorizar múltiplas transações de uma vez
2. **Sugestão de Valor**: Sugerir valor baseado em histórico
3. **Detecção de Duplicatas**: Avisar se transação similar já existe
4. **Categorização por Estabelecimento**: Aprender por nome do estabelecimento
5. **Compartilhamento de Aprendizado**: Usuários da mesma família compartilham aprendizado

---

## ✅ Conclusão

Sistema de categorização automática que:
- ✅ É **rápido** (resposta instantânea)
- ✅ É **inteligente** (aprende com o usuário)
- ✅ É **flexível** (usuário sempre pode corrigir)
- ✅ É **privado** (dados não saem do sistema)
- ✅ É **gratuito** (sem custos de API)

**Pronto para implementar?** Posso começar pela Fase 1 (MVP) agora mesmo!
