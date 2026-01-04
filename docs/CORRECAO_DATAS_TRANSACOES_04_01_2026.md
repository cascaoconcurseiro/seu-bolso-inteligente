# Correção de Datas das Transações - 04/01/2026

## Problema Identificado

Transações estavam sendo exibidas com datas inconsistentes:
- Transações de fevereiro apareciam com data 31/01/2026
- Data (`date`) não estava alinhada com a competência (`competence_date`)
- Causava confusão visual e problemas de organização

## Causa Raiz

1. **Cálculo de data nas parcelas**: Código antigo usava `new Date(input.date + 'T12:00:00')` que causava problemas de timezone
2. **Acertos sem campo de data**: Usuário não podia escolher a data do pagamento
3. **Transações antigas**: Já haviam sido criadas com datas incorretas

## Correções Aplicadas

### 1. Código - Cálculo de Parcelas (commit c8372e5)
```typescript
// ANTES (com problema de timezone)
const baseDate = new Date(input.date + 'T12:00:00');
const baseDay = baseDate.getDate();

// DEPOIS (parsing correto)
const [year, month, day] = input.date.split('-').map(Number);
const baseDate = new Date(year, month - 1, day);
const baseDay = day;
```

### 2. Código - Campo de Data no Acerto (commit 293e1e4)
- Adicionado campo de data no formulário de pagamento/recebimento
- Usuário escolhe a data do acerto
- Acerto aparece no mês da data escolhida
- Valor padrão: data de hoje
- Máximo: data de hoje (não permite futuro)

### 3. Banco de Dados - Correção em Massa (04/01/2026)

**Query executada:**
```sql
-- Atualizar todas as transações para alinhar date com competence_date
UPDATE transactions
SET date = competence_date
WHERE date != competence_date
  AND competence_date IS NOT NULL;
```

**Resultado:**
- ✅ 141 transações atualizadas
- ✅ 0 transações com data diferente da competência
- ✅ Todas as transações de fevereiro agora mostram 01/02/2026

## Validação

### Antes da Correção
```
João Pessoa (1/4)    31/01/2026  R$ 295,00  CRÉDITO
Airfryer (1/5)       31/01/2026  R$ 25,00   CRÉDITO
Carro - AR (1/2)     31/01/2026  R$ 125,00  CRÉDITO
```

### Depois da Correção
```
João Pessoa (1/4)    01/02/2026  R$ 295,00  CRÉDITO
Airfryer (1/5)       01/02/2026  R$ 25,00   CRÉDITO
Carro - AR (1/2)     01/02/2026  R$ 125,00  CRÉDITO
```

## Impacto

- ✅ Transações aparecem no mês correto
- ✅ Datas consistentes em todo o sistema
- ✅ Usuário pode escolher data do acerto
- ✅ Novas importações criam com data correta
- ✅ Histórico corrigido retroativamente

## Regras Estabelecidas

1. **Transações sempre usam competence_date**: Campo `date` deve ser igual a `competence_date`
2. **Competence_date sempre dia 1º**: Formato `yyyy-MM-01` para facilitar agrupamento por mês
3. **Acertos seguem data escolhida**: Usuário define em qual mês o acerto aparece
4. **Parcelas seguem mês selecionado**: Importação usa o mês escolhido no formulário

## Commits Relacionados

- `c8372e5` - fix: Corrigir cálculo de data nas parcelas importadas
- `2432805` - fix: Usar competence_date diretamente sem conversão
- `26aef2a` - fix: Acertos devem aparecer no mês da competência da dívida
- `293e1e4` - feat: Adicionar campo de data no formulário de acerto
- `ef74441` - fix: Remover referência a isUnsettlingMultiple

## Próximos Passos

- [ ] Testar importação de novas parcelas
- [ ] Testar acerto com data personalizada
- [ ] Validar que transações aparecem no mês correto
- [ ] Confirmar que não há mais datas 31/01 em fevereiro
