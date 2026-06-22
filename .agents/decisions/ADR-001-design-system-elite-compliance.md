# ADR-001: Sistema de Design Elite — Escala 8px e Hierarquia Tipográfica

## Decisão

Implementar **sistema de design matemático rigoroso** baseado nas Elite Design Rules:

1. **Escala de 8px obrigatória**: TODOS os espaçamentos (padding, margin, gap, height, width) devem ser múltiplos de 8 (8, 16, 24, 32, 40, 48, 56, 64...)
2. **Paleta tipográfica de 3 tamanhos**: display (text-3xl/30px), body (text-base/16px), caption (text-sm/14px)
3. **Hierarquia por peso e cor**: não por tamanho — usar bold/regular e variação de cor
4. **Remover valores customizados**: text-[11px], text-[10px], rounded-[1.25rem], h-11, h-9, gap-1.5, etc

## Motivo

**Auditoria de design (22/06/2026)** identificou:
- 50+ violações da escala de 8px (h-11, h-9, gap-1.5, h-1.5, space-y-1)
- 7 tamanhos de fonte diferentes em uma única tela (Reports.tsx)
- Valores customizados aleatórios sem justificativa matemática
- **Nota: 5.8/10** — sistema em apenas 60% de compliance

**Impactos negativos**:
- Design inconsistente e amador
- Decisões visuais aleatórias (não matemáticas)
- Hierarquia visual confusa
- Dificuldade de manutenção

**Benefícios da correção**:
- Consistência visual absoluta
- Design profissional e sóbrio
- Manutenibilidade — decisões previsíveis
- Acessibilidade melhorada
- Elite Design Status ✅

## Alternativas Descartadas

### Alternativa 1: Manter valores atuais
❌ **Rejeitada** — viola Elite Design Rules, design amador, inconsistência massiva

### Alternativa 2: Escala de 4px
❌ **Rejeitada** — granularidade excessiva, valores muito próximos dificultam hierarquia visual

### Alternativa 3: Paleta tipográfica de 5 tamanhos
❌ **Rejeitada** — hierarquia confusa, viola regra de máximo 3 tamanhos por tela

## Sistema de Design Aprovado

### **Escala de Espaçamento (múltiplos de 8px)**:
```
space-0  = 0px
space-2  = 8px   (0.5rem)
space-4  = 16px  (1rem)
space-6  = 24px  (1.5rem)
space-8  = 32px  (2rem)
space-10 = 40px  (2.5rem)
space-12 = 48px  (3rem)
space-14 = 56px  (3.5rem)
space-16 = 64px  (4rem)
space-20 = 80px  (5rem)
space-24 = 96px  (6rem)
```

### **Paleta Tipográfica (3 tamanhos)**:
```tsx
TYPOGRAPHY = {
  display: 'text-3xl',   // 30px (1.875rem) — Títulos principais (H1)
  body: 'text-base',     // 16px (1rem) — Texto corrido, parágrafos
  caption: 'text-sm',    // 14px (0.875rem) — Labels, metadados, descrições
}

// Hierarquia por peso:
font-bold      — Ênfase forte (títulos, CTAs)
font-semibold  — Ênfase média (subtítulos)
font-medium    — Ênfase leve (labels importantes)
font-normal    — Texto corrido

// Hierarquia por cor:
text-foreground           — Texto principal
text-muted-foreground     — Texto secundário
text-muted-foreground/80  — Texto terciário
```

### **Alturas de Componentes (múltiplos de 8px)**:
```
h-8  = 32px  — Inputs pequenos, badges
h-10 = 40px  — Inputs padrão, selects
h-12 = 48px  — Buttons padrão, inputs grandes
h-14 = 56px  — Buttons grandes
h-16 = 64px  — Headers, hero sections
```

### **Arredondamentos (múltiplos de 8px)**:
```
rounded-lg  = 8px   (0.5rem)
rounded-xl  = 12px  (0.75rem) — ⚠️ EXCEÇÃO permitida (12 = 1.5*8, arredondado)
rounded-2xl = 16px  (1rem)
rounded-3xl = 24px  (1.5rem)
rounded-4xl = 32px  (2rem)
```

## Plano de Implementação

**P0 — CRÍTICO**:
1. Substituir h-11 (44px) → h-12 (48px)
2. Substituir h-9 (36px) → h-10 (40px) ou h-8 (32px)
3. Remover text-[11px], text-[10px] → text-xs (caption)
4. Remover rounded-[1.25rem] → rounded-2xl ou rounded-3xl
5. Aplicar paleta tipográfica de 3 tamanhos

**P1 — ALTA**:
6. Substituir space-y-1 (4px) → space-y-2 (8px)
7. Substituir gap-1.5 (6px) → gap-2 (8px)
8. Substituir h-1.5 (6px) → h-2 (8px)
9. Adicionar CTAs em empty states

**P2 — REFINAMENTO**:
10. Adicionar focus-visible:ring em botões customizados
11. Validar contraste WCAG AA

## Impacto

**Arquivos afetados** (estimativa): 30-40 componentes
**Tempo estimado**: 4-6 horas
**Breaking changes**: Nenhum — apenas ajustes visuais
**Rollback**: git reset se necessário

## Status

✅ **APROVADO** — Execução imediata  
Data: 22/06/2026  
Responsável: Agência de Engenharia e Design de Elite
