# 🔍 COMO EXECUTAR A AUDITORIA COMPLETA

## 📋 VISÃO GERAL

Este guia explica como executar a auditoria completa do sistema antes do lançamento em produção.

---

## 🗂️ DOCUMENTOS DA AUDITORIA

A auditoria completa consiste em 4 documentos principais:

1. **SCRIPT_AUDITORIA_COMPLETA_PRODUCAO.sql** - Script SQL para verificar integridade do banco
2. **CHECKLIST_TESTES_PRODUCAO_COMPLETO.md** - Checklist de testes manuais
3. **ANALISE_TECNICA_CODIGO_PRODUCAO.md** - Análise técnica do código
4. **RELATORIO_FINAL_AUDITORIA_PRODUCAO.md** - Relatório consolidado

---

## 🚀 PASSO A PASSO

### ETAPA 1: Auditoria do Banco de Dados (30 minutos)

#### 1.1 Acessar o Supabase
```bash
# Opção 1: Via Dashboard Web
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "SQL Editor"

# Opção 2: Via CLI Local
supabase db reset  # Resetar banco local (se necessário)
supabase start     # Iniciar Supabase local
```

#### 1.2 Executar Script de Auditoria
```sql
-- Copie e cole o conteúdo de:
-- docs/SCRIPT_AUDITORIA_COMPLETA_PRODUCAO.sql

-- Execute no SQL Editor do Supabase
-- O script vai gerar um relatório completo com:
-- - Estrutura das tabelas
-- - Foreign keys
-- - Verificação de unicidade
-- - Integridade referencial
-- - Validação de valores financeiros
-- - Sistema de compartilhamento
-- - Sistema de viagens
-- - Parcelamentos
-- - Estatísticas gerais
-- - Resumo de problemas críticos
```

#### 1.3 Analisar Resultados
```
✅ Se todos os problemas mostrarem "0 total" ou "✅ OK" → APROVADO
⚠️ Se houver problemas com "⚠️ ATENÇÃO" → Investigar
❌ Se houver problemas com "❌ CRÍTICO" → CORRIGIR ANTES DO LANÇAMENTO
```

#### 1.4 Corrigir Problemas (se houver)
```sql
-- Exemplo: Se houver transações sem competence_date
UPDATE transactions
SET competence_date = DATE_TRUNC('month', date::date)
WHERE competence_date IS NULL;

-- Exemplo: Se houver splits sem user_id
-- Investigar e corrigir manualmente
SELECT * FROM transaction_splits WHERE user_id IS NULL;
```

---

### ETAPA 2: Testes Manuais (4-6 horas)

#### 2.1 Preparar Ambiente de Testes
```bash
# 1. Criar usuário de teste
# 2. Criar dados de exemplo
# 3. Ter pelo menos 2 usuários para testar compartilhamento
```

#### 2.2 Executar Checklist
```
Abra: docs/CHECKLIST_TESTES_PRODUCAO_COMPLETO.md

Siga o checklist seção por seção:
1. ✅ Autenticação e Perfil
2. ✅ Contas Bancárias
3. ✅ Cartões de Crédito
4. ✅ Transações Normais
5. ✅ Transferências
6. ✅ Transações Parceladas
7. ✅ Sistema de Família
8. ✅ Transações Compartilhadas
9. ✅ Viagens
10. ✅ Câmbio e Moedas
11. ✅ Cálculos Financeiros
12. ✅ Orçamentos
13. ✅ Notificações
14. ✅ Relatórios
15. ✅ Segurança e Permissões
16. ✅ Testes de Integridade
17. ✅ Interface e UX
18. ✅ Performance
19. ✅ Edge Cases
20. ✅ Concorrência

Marque cada item após testar: [ ] → [x]
```

#### 2.3 Documentar Problemas
```markdown
### Problemas Encontrados

1. **[CRÍTICO/GRAVE/MODERADO/MENOR]** Descrição do problema
   - **Onde:** Página/Componente
   - **Como reproduzir:** Passo a passo
   - **Comportamento esperado:** O que deveria acontecer
   - **Comportamento atual:** O que está acontecendo
   - **Screenshot:** (se aplicável)
```

---

### ETAPA 3: Análise Técnica do Código (2 horas)

#### 3.1 Revisar Código Crítico
```bash
# Revisar arquivos principais:
src/hooks/useTransactions.ts
src/hooks/useSharedFinances.ts
src/hooks/useTrips.ts
src/services/SafeFinancialCalculator.ts
src/services/ledger.ts
```

#### 3.2 Verificar Padrões
```bash
# Executar linter
npm run lint

# Verificar tipos TypeScript
npx tsc --noEmit

# Verificar bundle size
npm run build
ls -lh dist/
```

#### 3.3 Revisar Migrations
```bash
# Listar todas as migrations
ls -la supabase/migrations/

# Verificar ordem cronológica
# Verificar que não há conflitos
# Verificar que todas foram aplicadas
```

---

### ETAPA 4: Testes de Performance (1 hora)

#### 4.1 Lighthouse (Chrome DevTools)
```
1. Abrir Chrome DevTools (F12)
2. Ir em "Lighthouse"
3. Selecionar "Performance" e "Best Practices"
4. Clicar em "Analyze page load"
5. Verificar scores:
   - Performance: > 80
   - Best Practices: > 90
```

#### 4.2 Testar com Dados Reais
```
1. Criar 100+ transações
2. Criar 10+ contas
3. Criar 5+ viagens
4. Verificar que tudo carrega rápido (< 2s)
```

#### 4.3 Testar Queries Lentas
```sql
-- No Supabase, ativar "Query Performance Insights"
-- Executar operações pesadas
-- Verificar queries lentas (> 1s)
-- Otimizar se necessário
```

---

### ETAPA 5: Testes de Segurança (1 hora)

#### 5.1 Testar RLS Policies
```javascript
// Tentar acessar dados de outro usuário
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', 'outro-usuario-id'); // Deve retornar vazio ou erro

// Tentar inserir dados para outro usuário
const { error } = await supabase
  .from('transactions')
  .insert({
    user_id: 'outro-usuario-id', // Deve falhar
    amount: 100,
    description: 'Teste'
  });
```

#### 5.2 Testar Validações
```javascript
// Tentar criar transação inválida
- Valor zero ou negativo → Deve falhar
- Descrição vazia → Deve falhar
- Compartilhada sem splits → Deve falhar
- Splits com soma > 100% → Deve falhar
```

#### 5.3 Testar Autenticação
```
1. Tentar acessar páginas sem login → Deve redirecionar
2. Fazer logout → Deve limpar sessão
3. Tentar usar token expirado → Deve falhar
```

---

### ETAPA 6: Testes em Diferentes Ambientes (1 hora)

#### 6.1 Navegadores
```
✅ Chrome (última versão)
✅ Firefox (última versão)
✅ Safari (última versão)
✅ Edge (última versão)
```

#### 6.2 Dispositivos
```
✅ Desktop (1920x1080)
✅ Laptop (1366x768)
✅ Tablet (768x1024)
✅ Mobile (375x667)
```

#### 6.3 Sistemas Operacionais
```
✅ Windows
✅ macOS
✅ Linux
✅ iOS
✅ Android
```

---

## 📊 CRITÉRIOS DE APROVAÇÃO

### ✅ APROVADO se:
- [ ] Script SQL não encontrou problemas críticos
- [ ] 100% do checklist manual foi executado
- [ ] Nenhum problema crítico foi encontrado
- [ ] Problemas graves foram corrigidos
- [ ] Performance está adequada (< 2s)
- [ ] Segurança está adequada (RLS funcionando)
- [ ] Funciona em todos os navegadores principais

### ⚠️ APROVADO COM RESSALVAS se:
- [ ] Problemas moderados foram encontrados mas documentados
- [ ] Performance está aceitável (< 3s)
- [ ] Pequenos bugs de UX foram encontrados

### ❌ REPROVADO se:
- [ ] Problemas críticos não foram corrigidos
- [ ] Cálculos financeiros estão incorretos
- [ ] RLS não está funcionando
- [ ] Sistema está instável
- [ ] Performance é inaceitável (> 5s)

---

## 📝 RELATÓRIO FINAL

Após executar todas as etapas, preencher:

### Resumo
```
Data: ___/___/______
Responsável: _________________
Tempo Total: _____ horas

Status: [ ] APROVADO [ ] APROVADO COM RESSALVAS [ ] REPROVADO
```

### Problemas Encontrados
```
CRÍTICOS: ___ (devem ser 0)
GRAVES: ___ (devem ser 0)
MODERADOS: ___
MENORES: ___
```

### Métricas
```
Funcionalidades Testadas: ____%
Problemas Corrigidos: ____%
Performance Score: ___/100
Security Score: ___/100
```

### Recomendações
```
1. [Listar recomendações]
2. [Listar recomendações]
3. [Listar recomendações]
```

### Decisão Final
```
[ ] Sistema APROVADO para produção
[ ] Sistema APROVADO COM RESSALVAS
[ ] Sistema REPROVADO - necessita correções

Assinatura: _________________
Data: ___/___/______
```

---

## 🚀 APÓS APROVAÇÃO

### Checklist de Deploy
```
[ ] Fazer backup completo do banco de dados
[ ] Configurar variáveis de ambiente de produção
[ ] Configurar domínio e SSL
[ ] Configurar monitoramento (Sentry, etc.)
[ ] Configurar alertas de erro
[ ] Fazer deploy em produção
[ ] Testar em produção (smoke test)
[ ] Monitorar primeiras 24 horas
[ ] Documentar problemas encontrados
[ ] Planejar melhorias da primeira semana
```

---

## 📞 SUPORTE

Se encontrar problemas durante a auditoria:

1. **Documentar detalhadamente** o problema
2. **Tentar reproduzir** em ambiente de desenvolvimento
3. **Verificar logs** do Supabase e do navegador
4. **Consultar documentação** dos componentes envolvidos
5. **Criar issue** no repositório (se aplicável)

---

## 📚 RECURSOS ADICIONAIS

- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação do React Query](https://tanstack.com/query/latest)
- [Guia de RLS do Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Boa sorte com a auditoria! 🚀**
