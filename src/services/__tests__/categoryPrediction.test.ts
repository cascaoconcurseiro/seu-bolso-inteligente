/**
 * Testes para Categorização Automática
 * TASK 2.5: Habilitar e Testar Categorização Automática
 */

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

  describe('predictCategory', () => {
    it('deve retornar null para descrição vazia', async () => {
      const result = await CategoryPredictionService.predictCategory('', 'user-123', 'expense');
      expect(result).toBeNull();
    });

    it('deve retornar null para descrição muito curta', async () => {
      const result = await CategoryPredictionService.predictCategory('ab', 'user-123', 'expense');
      expect(result).toBeNull();
    });

    it('deve retornar predição do histórico do usuário', async () => {
      const mockPrediction = {
        category_id: 'cat-123',
        confidence: 0.9,
        categories: { id: 'cat-123', name: 'Alimentação' },
        times_used: 5,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: mockPrediction,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await CategoryPredictionService.predictCategory(
        'Compra no supermercado',
        'user-123',
        'expense'
      );

      expect(result).toBeDefined();
      expect(result?.categoryId).toBe('cat-123');
      expect(result?.confidence).toBe(0.9);
    });

    it('deve retornar null se nenhuma predição for encontrada', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await CategoryPredictionService.predictCategory(
        'Descrição aleatória',
        'user-123',
        'expense'
      );

      expect(result).toBeNull();
    });

    it('deve lidar com erros de query graciosamente', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: new Error('Database error'),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await CategoryPredictionService.predictCategory(
        'Compra',
        'user-123',
        'expense'
      );

      expect(result).toBeNull();
    });
  });

  describe('learnFromUser', () => {
    it('deve registrar aprendizado do usuário', async () => {
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
        'Compra no supermercado',
        'cat-123',
        'user-123',
        false
      );

      expect(insertMock).toHaveBeenCalled();
    });

    it('deve ignorar descrição vazia', async () => {
      const insertMock = vi.fn();
      
      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      await CategoryPredictionService.learnFromUser('', 'cat-123', 'user-123', false);

      expect(insertMock).not.toHaveBeenCalled();
    });

    it('deve ignorar descrição muito curta', async () => {
      const insertMock = vi.fn();
      
      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      await CategoryPredictionService.learnFromUser('ab', 'cat-123', 'user-123', false);

      expect(insertMock).not.toHaveBeenCalled();
    });
  });
});
