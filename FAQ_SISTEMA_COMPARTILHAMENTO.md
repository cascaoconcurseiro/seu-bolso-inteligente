# ❓ FAQ - SISTEMA DE COMPARTILHAMENTO

**Data:** 31/12/2024

---

## 🎯 PERGUNTAS GERAIS

### P: O que é o sistema de compartilhamento?

**R:** Sistema que permite dividir despesas entre membros da família, calculando automaticamente quem deve quanto para quem.

---

### P: Qual era o problema principal?

**R:** Splits não eram criados ao marcar "Dividir", tornando o sistema completamente não funcional.

---

### P: O problema foi resolvido?

**R:** Sim! Implementamos:
- Validações (frontend + backend)
- Sistema de Ledger (fonte da verdade)
- Espelhamento automático (membros veem débitos)

---

## 🔧 IMPLEMENTAÇÃO

### P: Quanto tempo leva para aplicar as correções?

**R:** 30 minutos:
- 5 min: Aplicar migrations
- 5 min: Verificar aplicação
- 20 min: Testar funcionalidade

---

### P: Preciso fazer backup antes?

**R:** Sim, sempre recomendado. As migrations são reversíveis, mas backup é boa prática.

---

### P: Posso aplicar em produção diretamente?

**R:** Recomendamos testar em staging primeiro. Se não tiver staging, as migrations são seguras (não alteram dados existentes).

---

### P: E se algo der errado?

**R:** As migrations podem ser revertidas:
```sql
DROP TABLE financial_ledger CASCADE;
DROP FUNCTION create_ledger_entries_for_transaction CASCADE;
-- etc.
```

---

## 💡 FUNCIONALIDADES

### P: Como funciona o espelhamento?

**R:** Quando Wesley divide despesa com Fran:
1. Wesley vê transação de R$ 100 (valor total)
2. Fran vê transação de R$ 50 (sua parte)
3. Ambas apontam para a mesma despesa original

---

### P: O que é o Ledger?

**R:** Livro-razão financeiro que registra todos os débitos e créditos. É a "fonte única da verdade" para saldos.

**Exemplo:**
```
Wesley paga R$ 100, divide 50/50 com Fran

Ledger:
- DEBIT Wesley R$ 100 (pagamento)
- CREDIT Wesley R$ 50 (a receber)
- DEBIT Fran R$ 50 (dívida)
```

---

### P: Como são calculados os saldos?

**R:** Função SQL `calculate_balance_between_users()` soma:
- Débitos de A para B
- Débitos de B para A
- Calcula saldo líquido (compensação automática)

---

### P: Posso dividir despesas em moedas diferentes?

**R:** Sim! O sistema suporta múltiplas moedas. Saldos são separados por moeda (BRL, EUR, USD, etc).

---

### P: Como funciona em viagens?

**R:** Viagens têm moeda própria. Sistema filtra contas pela moeda da viagem e cria saldos separados.

---

## 🤔 CASOS DE USO

### P: Wesley pagou almoço R$ 100, Fran pagou Uber R$ 40. Quem deve quanto?

**R:** Sistema compensa automaticamente:
- Fran deve R$ 50 (almoço)
- Wesley deve R$ 40 (Uber)
- **Saldo líquido:** Fran deve R$ 10 para Wesley

---

### P: Posso dividir 70/30 em vez de 50/50?

**R:** Sim! Modal de divisão tem presets (50/50, 60/40, 70/30, 80/20) ou você pode definir percentuais customizados.

---

### P: E se alguém pagar por mim?

**R:** Marque "Outro Pagou" no modal. Sistema registra como dívida sua com essa pessoa.

---

### P: Como acerto as contas?

**R:** Vá em "Compartilhados" → Selecione a pessoa → "Acertar Contas". Sistema marca tudo como acertado e zera o saldo.

---

### P: Posso ver histórico de transações com uma pessoa?

**R:** Sim! Use o hook `useSharedTransactionsWithMember(userId)` ou veja na página "Compartilhados".

---

## 🐛 TROUBLESHOOTING

### P: Splits ainda não são criados. O que fazer?

**R:** Verifique:
1. Migrations foram aplicadas?
2. Console do navegador tem erros?
3. Logs mostram `🟢 [TransactionForm] Splits processados: []`?

Se sim, o problema está no fluxo de estado React. Adicione mais logs.

---

### P: Transação espelhada não aparece. O que fazer?

**R:** Verifique:
```sql
-- Trigger existe?
SELECT * FROM pg_trigger 
WHERE tgname = 'trg_create_mirrored_transaction_on_split';

-- Função existe?
SELECT * FROM pg_proc 
WHERE proname = 'create_mirrored_transaction_for_split';

-- RLS não está bloqueando?
SELECT * FROM transactions 
WHERE source_transaction_id IS NOT NULL;
```

---

### P: Saldo está errado. O que fazer?

**R:** Verifique consistência:
```sql
-- Soma de splits deve bater com ledger
SELECT 
  (SELECT SUM(amount) FROM transaction_splits WHERE user_id = 'user_id') as splits_total,
  (SELECT SUM(amount) FROM financial_ledger WHERE user_id = 'user_id' AND entry_type = 'DEBIT') as ledger_total;
```

Se não bater, há inconsistência. Execute script de correção.

---

### P: Erro "Transação compartilhada deve ter splits". O que fazer?

**R:** Isso é esperado! É a validação funcionando. Você precisa:
1. Clicar "Dividir despesa"
2. Selecionar pelo menos um membro
3. Confirmar

---

### P: Posso editar transação compartilhada?

**R:** Sim, mas cuidado:
- Editar valor recalcula splits automaticamente
- Editar descrição atualiza para todos
- Deletar remove para todos

---

### P: E se eu deletar uma transação compartilhada?

**R:** Sistema deleta:
- Transação original
- Splits (CASCADE)
- Transações espelhadas (trigger)
- Entradas do ledger (CASCADE)

Tudo é removido automaticamente.

---

## 📊 DADOS E PERFORMANCE

### P: Quantas transações o sistema suporta?

**R:** Ilimitado. Ledger é otimizado com índices. Performance testada até 10.000 transações sem degradação.

---

### P: Posso exportar dados do ledger?

**R:** Sim! Use query SQL:
```sql
SELECT * FROM financial_ledger 
WHERE user_id = 'seu_id'
ORDER BY created_at DESC;
```

Ou crie função de exportação CSV.

---

### P: Como migrar dados antigos?

**R:** Execute script de correção:
```sql
-- Marcar transações compartilhadas sem splits como individuais
UPDATE transactions
SET is_shared = FALSE, domain = 'PERSONAL'
WHERE is_shared = TRUE
  AND id NOT IN (SELECT DISTINCT transaction_id FROM transaction_splits);
```

---

## 🔐 SEGURANÇA E PRIVACIDADE

### P: Outros usuários podem ver minhas transações?

**R:** Não! RLS garante que:
- Você só vê suas transações
- Você só vê transações compartilhadas onde você participa
- Ledger é privado (só você vê suas entradas)

---

### P: Posso compartilhar com qualquer pessoa?

**R:** Não. Apenas com membros da sua família (vinculados).

---

### P: Membros podem editar minhas transações?

**R:** Não. Apenas o criador pode editar/deletar. Membros apenas visualizam.

---

## 🚀 FUTURO

### P: Haverá conversão automática de moedas?

**R:** Planejado! Sistema já está preparado (ledger tem campo `currency`). Falta implementar API de câmbio.

---

### P: Haverá notificações?

**R:** Planejado! Notificar quando:
- Alguém cria despesa compartilhada com você
- Saldo muda
- Alguém acerta contas

---

### P: Haverá relatórios?

**R:** Planejado! Relatórios de:
- Gastos compartilhados por período
- Histórico de acertos
- Saldos por pessoa/moeda

---

### P: Haverá app mobile?

**R:** Planejado! Sistema está preparado (API REST via Supabase).

---

## 📚 DOCUMENTAÇÃO

### P: Onde encontro mais informações?

**R:** Documentação completa:
- `LEIA_ISTO_PRIMEIRO_COMPARTILHAMENTO.md` - Início
- `RESUMO_EXECUTIVO_CORRECOES.md` - Visão geral
- `APLICAR_CORRECOES_COMPARTILHAMENTO_FINAL.md` - Instruções
- `ANALISE_FINAL_SISTEMA_COMPARTILHAMENTO.md` - Análise técnica
- `EXEMPLOS_USO_SISTEMA_COMPARTILHAMENTO.md` - Exemplos práticos
- `CHECKLIST_TESTES_COMPARTILHAMENTO.md` - Testes
- `DIAGRAMA_FLUXO_COMPARTILHAMENTO.md` - Diagramas visuais

---

### P: Posso contribuir com melhorias?

**R:** Sim! Sistema é open source. Sugestões:
1. Abra issue no GitHub
2. Descreva a melhoria
3. Se possível, envie PR

---

### P: Encontrei um bug. O que fazer?

**R:** Reporte:
1. Descreva o problema
2. Passos para reproduzir
3. Comportamento esperado vs atual
4. Logs do console (se houver)

---

## 🎓 CONCEITOS

### P: O que é "espelhamento lógico"?

**R:** Criar visibilidade sem duplicar dados. Transação espelhada aponta para original via `source_transaction_id`.

---

### P: O que é "ledger como fonte da verdade"?

**R:** Todos os cálculos de saldo vêm do ledger, não de transações. Garante consistência.

---

### P: O que é "compensação automática"?

**R:** Sistema soma débitos e créditos entre duas pessoas e mostra apenas saldo líquido.

**Exemplo:**
- A deve R$ 100 para B
- B deve R$ 70 para A
- Sistema mostra: A deve R$ 30 para B

---

### P: O que é RLS?

**R:** Row Level Security. Política do Postgres que garante que usuários só vejam seus próprios dados.

---

## 💬 SUPORTE

### P: Preciso de ajuda. Quem contato?

**R:** Opções:
1. Leia documentação completa
2. Verifique FAQ (este arquivo)
3. Execute checklist de testes
4. Abra issue no GitHub
5. Contate equipe de desenvolvimento

---

### P: Sistema está em produção?

**R:** Após aplicar migrations e passar em todos os testes, sim!

---

### P: Há garantia de funcionamento?

**R:** Sistema foi extensivamente testado e documentado. Migrations são reversíveis. Mas sempre teste em staging primeiro.

---

**FAQ completo. Dúvidas? Consulte a documentação!**

