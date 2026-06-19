import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryPredictionService } from '../categoryPredictionService';
import { supabase } from '@/integrations/supabase/client';

// Mock do supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock do logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CategoryPredictionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractCleanPattern', () => {
    it('deve limpar datas e horários de descrições transacionais', () => {
      const result1 = CategoryPredictionService.extractCleanPattern('Compra 21/05/2026 UBER TRIP');
      expect(result1).toBe('uber trip');

      const result2 = CategoryPredictionService.extractCleanPattern('PG *IFOOD 12:45');
      expect(result2).toBe('ifood');
    });

    it('deve expurgar hashes, sequenciais longos e finais de cartões', () => {
      const result1 = CategoryPredictionService.extractCleanPattern('COMPRA DEBITO EXTRA Final 4321');
      expect(result1).toBe('extra');

      const result2 = CategoryPredictionService.extractCleanPattern('99POP *CORRIDA #9872938a92');
      expect(result2).toBe('99pop corrida');
    });

    it('deve remover caracteres especiais duplicados e reter acentuação em português', () => {
      const result = CategoryPredictionService.extractCleanPattern('  pão de açúcar!!!  ');
      expect(result).toBe('pão de açúcar');
    });
  });

  describe('predictCategory', () => {
    it('deve retornar null para descrição vazia ou muito curta', async () => {
      const res1 = await CategoryPredictionService.predictCategory('', 'user-123', 'expense');
      expect(res1).toBeNull();

      const res2 = await CategoryPredictionService.predictCategory('ab', 'user-123', 'expense');
      expect(res2).toBeNull();
    });

    it('deve priorizar o aprendizado personalizado obtido em memória com pontuação superior', async () => {
      const mockLearnings = [
        {
          id: 'learn-1',
          category_id: 'cat-alimentacao',
          confidence: 0.9,
          description_pattern: 'supermercado extra',
          times_used: 10,
          categories: { id: 'cat-alimentacao', name: 'Alimentação' },
        },
        {
          id: 'learn-2',
          category_id: 'cat-transporte',
          confidence: 0.8,
          description_pattern: 'uber viagem',
          times_used: 5,
          categories: { id: 'cat-transporte', name: 'Transporte' },
        }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          then: function(resolve: any) { resolve({ data: mockLearnings, error: null }); }
        }),
      } as any);

      // Descrição que contém o padrão aprendido "supermercado extra" com ruído transacional
      const result = await CategoryPredictionService.predictCategory(
        'COMPRA CARTAO 21/05 SUPERMERCADO EXTRA BARRA',
        'user-123',
        'expense'
      );

      expect(result).toBeDefined();
      expect(result?.categoryId).toBe('cat-alimentacao');
      expect(result?.confidence).toBe(0.9);
      expect(result?.reason).toBe('Baseado no seu histórico');
    });

    it('deve aplicar correspondência difusa (fuzzy) para erros de digitação leves nas palavras-chave', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Alimentação', icon: '🍽️', parent_category_id: 'parent-1' },
        { id: 'cat-2', name: 'Transporte', icon: '🚗', parent_category_id: 'parent-1' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          then: function(resolve: any) { resolve({ data: mockCategories, error: null }); }
        }),
      } as any);

      // Usuário digita "ifod" (erro de digitação de "ifood")
      const result = await CategoryPredictionService.predictCategory(
        'ifod pedido para o escritório',
        'user-123',
        'expense'
      );

      expect(result).toBeDefined();
      expect(result?.categoryId).toBe('cat-1'); // Deve casar com Alimentação pelo conceito de Delivery/iFood
      expect(result?.reason).toContain('Detectado: "ifood"');
    });

    it('deve realizar casamento conceitual dinâmico mesmo se a categoria tiver nome customizado', async () => {
      const mockCategories = [
        { id: 'cat-custom-rancho', name: 'Rancho Mensal', icon: '🛒', parent_category_id: 'parent-1' },
        { id: 'cat-outros', name: 'Outras Coisas', icon: '📦', parent_category_id: 'parent-1' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          then: function(resolve: any) { resolve({ data: mockCategories, error: null }); }
        }),
      } as any);

      // "extra" é keyword de "Supermercado". E "Rancho Mensal" possui "rancho" como sinônimo de Supermercado!
      const result = await CategoryPredictionService.predictCategory(
        'Compra no Extra Supermercados',
        'user-123',
        'expense'
      );

      expect(result).toBeDefined();
      expect(result?.categoryId).toBe('cat-custom-rancho');
      expect(result?.categoryName).toBe('Rancho Mensal');
    });
  });

  describe('learnFromUser', () => {
    it('deve registrar novo aprendizado higienizado quando não existir correspondência', async () => {
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: insertMock,
      } as any);

      await CategoryPredictionService.learnFromUser(
        'COMPRA CARTAO 12/05 UBER TRIP #1234',
        'cat-transporte',
        'user-123',
        false
      );

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        description_pattern: 'uber trip', // Padrão limpo gravado
        category_id: 'cat-transporte',
        confidence: 0.7,
      }));
    });

    it('deve penalizar e remover aprendizados concorrentes obsoletos em caso de correção manual', async () => {
      const deleteMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockResolvedValue({ error: null });
      
      // Padrões concorrentes para a mesma descrição, mas outras categorias
      const competitorPatterns = [
        { id: 'learn-old-1', description_pattern: 'uber', category_id: 'cat-outros', confidence: 0.4 },
        { id: 'learn-old-2', description_pattern: 'uber', category_id: 'cat-lazer', confidence: 0.9 }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        // Selecionar concorrentes
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: competitorPatterns,
                error: null,
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({ eq: deleteMock }),
        update: vi.fn().mockReturnValue({ eq: updateMock }),
      } as any);

      await CategoryPredictionService.learnFromUser(
        'Uber Corrida para Casa',
        'cat-transporte',
        'user-123',
        true // Foi correção!
      );

      // 'learn-old-1' tinha confiança 0.4. 0.4 - 0.3 = 0.1 <= 0.2, logo deve ser excluído
      expect(deleteMock).toHaveBeenCalled();
      
      // 'learn-old-2' tinha confiança 0.9. 0.9 - 0.3 = 0.6 > 0.2, logo deve ser atualizado/penalizado
      expect(updateMock).toHaveBeenCalled();
    });
  });
});
