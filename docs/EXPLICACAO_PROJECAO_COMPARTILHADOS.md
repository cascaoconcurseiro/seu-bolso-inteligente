# Explicação: Projeção de Compartilhados

## Data: 05/01/2026

## Situação Atual

A Fran está vendo R$ 259,00 de compartilhados na projeção de fim de mês de janeiro/2026.

## Análise dos Dados

### Transações Compartilhadas em Janeiro/2026

| Descrição | Valor | Criador | Devedor | Status |
|-----------|-------|---------|---------|--------|
| teste compartilhado | R$ 5,00 | Wesley | Fran | Não pago |
| Gasolina Carrefour | R$ 124,00 | Wesley | Fran | Não pago |
| geometria | R$ 130,00 | Wesley | Fran | Não pago |
| **TOTAL** | **R$ 259,00** | | | |

### Transação de Balanceamento

| Descrição | Valor | Criador | Tipo | Tem Splits? |
|-----------|-------|---------|------|-------------|
| Carro - Balanceamento | R$ 260,00 | Wesley | Espelhada (mirror) | NÃO |

A transação de balanceamento:
- É uma transação ESPELHADA (mirror) criada automaticamente
- NÃO tem splits associados
- NÃO está sendo contada na projeção
- Aparece corretamente na página Compartilhados

## Conclusão

✅ **A projeção está CORRETA**

A Fran realmente deve R$ 259,00 ao Wesley por 3 transações compartilhadas legítimas:
1. teste compartilhado: R$ 5,00
2. Gasolina Carrefour: R$ 124,00
3. geometria: R$ 130,00

O balanceamento (R$ 260,00) NÃO está sendo contado na projeção porque:
- É uma transação espelhada (mirror)
- Não tem splits
- Não deve ser contada como dívida

## Regras de Projeção

A função `get_monthly_projection` conta como "compartilhados a pagar" apenas:

1. ✅ Splits onde `user_id = usuário logado` (eu tenho um split)
2. ✅ E `creator_user_id != usuário logado` (eu NÃO criei a transação)
3. ✅ E `is_settled = false` (ainda não paguei)
4. ✅ E `competence_date` está no mês atual
5. ✅ E `trip_id IS NULL` (não é de viagem)
6. ✅ E `currency = 'BRL'` (moeda nacional)

## Ações Necessárias

Se a Fran não deve esses R$ 259,00:
1. Verificar se as 3 transações estão corretas
2. Se estiverem erradas, excluí-las
3. Se já foram pagas, marcar como "acertadas" na página Compartilhados

Se a Fran realmente deve:
- Nenhuma ação necessária
- A projeção está correta
- Quando ela pagar (acertar), o valor sairá da projeção automaticamente
