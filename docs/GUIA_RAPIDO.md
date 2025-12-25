# 🚀 Guia Rápido - Começar a Usar

## ⚡ Início Rápido (3 Passos)

### 1️⃣ Aplicar as Migrations no Supabase

**Opção A: Supabase Dashboard (Mais Fácil)**
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Copie e cole cada migration na ordem:
   - `supabase/migrations/20251226_001_consolidacao_schema.sql`
   - `supabase/migrations/20251226_002_constraints_e_auditoria.sql`
   - `supabase/migrations/20251226_003_budgets_goals_investments.sql`
5. Execute cada uma (botão RUN)

**Opção B: Supabase CLI**
```bash
cd seu-bolso-inteligente
supabase db push
```

### 2️⃣ Instalar Dependências (se necessário)

```bash
npm install
```

### 3️⃣ Executar o Projeto

```bash
npm run dev
```

Pronto! Acesse http://localhost:5173 🎉

## 📱 Novas Páginas Disponíveis

Agora você tem acesso a:

- 📊 **Orçamentos** - `/orcamentos`
  - Controle seus gastos por categoria
  - Defina limites mensais ou anuais
  - Receba alertas quando estiver próximo do limite

- 🎯 **Metas** - `/metas`
  - Defina objetivos financeiros
  - Acompanhe o progresso
  - Adicione contribuições

- 📈 **Investimentos** - `/investimentos`
  - Gerencie sua carteira
  - Acompanhe rentabilidade
  - Visualize alocação de ativos

## 🎯 Exemplos de Uso

### Criar seu Primeiro Orçamento

1. Acesse `/orcamentos`
2. Clique em "Novo Orçamento"
3. Preencha:
   - **Categoria**: Alimentação
   - **Valor**: R$ 1.000,00
   - **Período**: Mensal
   - **Alerta em**: 80%
4. Clique em "Criar Orçamento"

Agora você verá o progresso do seu orçamento em tempo real! 📊

### Criar sua Primeira Meta

1. Acesse `/metas`
2. Clique em "Nova Meta"
3. Preencha:
   - **Nome**: Viagem para Europa
   - **Valor Alvo**: R$ 15.000,00
   - **Data Alvo**: 31/12/2025
   - **Prioridade**: Alta
4. Clique em "Criar Meta"

Para adicionar contribuições, clique no botão "+" no card da meta! 🎯

### Cadastrar seu Primeiro Investimento

1. Acesse `/investimentos`
2. Clique em "Novo Investimento"
3. Preencha:
   - **Nome**: Petrobras PN
   - **Tipo**: Ação
   - **Ticker**: PETR4
   - **Quantidade**: 100
   - **Preço de Compra**: R$ 35,50
   - **Preço Atual**: R$ 38,20
4. Clique em "Criar Investimento"

Você verá automaticamente o lucro/prejuízo e a rentabilidade! 📈

## 🎨 Navegação

As novas páginas já estão no menu principal:

```
📊 Início
💰 Transações
🏦 Contas
💳 Cartões
🐷 Orçamentos ← NOVO
🎯 Metas ← NOVO
📈 Investimentos ← NOVO
👥 Compartilhados
✈️ Viagens
👨‍👩‍👧 Família
📊 Relatórios
⚙️ Configurações
```

## 🔥 Recursos Principais

### Orçamentos
- ✅ Progresso visual em tempo real
- ✅ Alertas automáticos
- ✅ Comparação com gastos reais
- ✅ Indicador de orçamento excedido

### Metas
- ✅ Progresso percentual
- ✅ Contribuições incrementais
- ✅ Priorização (baixa/média/alta)
- ✅ Contagem regressiva de dias
- ✅ Marcação automática de conclusão

### Investimentos
- ✅ Cálculo automático de rentabilidade
- ✅ Gráfico de alocação de carteira
- ✅ Atualização rápida de preços
- ✅ Resumo de totais (investido, atual, lucro)

## 🎓 Dicas

### Para Orçamentos
- Comece com categorias principais (Alimentação, Transporte, Moradia)
- Configure alertas em 80% para ter tempo de ajustar
- Revise mensalmente e ajuste os valores

### Para Metas
- Seja específico no nome (ex: "Viagem Europa 2025" em vez de "Viagem")
- Defina prazos realistas
- Use prioridades para focar no que é mais importante
- Adicione contribuições regulares (ex: todo mês)

### Para Investimentos
- Atualize os preços regularmente
- Use o campo "Observações" para anotar estratégias
- Acompanhe a alocação da carteira para diversificar

## 🔒 Segurança

Todos os seus dados estão protegidos:
- ✅ Autenticação obrigatória
- ✅ Cada usuário vê apenas seus dados
- ✅ Todas as mudanças são auditadas
- ✅ Validações no banco de dados

## 🆘 Problemas Comuns

### "Erro ao criar orçamento"
- Verifique se as migrations foram aplicadas
- Confirme que está autenticado
- Verifique se o valor é positivo

### "Página não encontrada"
- Confirme que o App.tsx foi atualizado com as novas rotas
- Limpe o cache do navegador (Ctrl+Shift+R)

### "Dados não aparecem"
- Verifique a conexão com o Supabase
- Confirme que as migrations foram aplicadas corretamente
- Verifique o console do navegador para erros

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `IMPLEMENTACAO_COMPLETA.md` - Documentação técnica completa
- `PLANO_MIGRACAO_PE_PARA_NOVO.md` - Plano de migração detalhado
- `MIGRACAO_APLICADA.md` - Status da migração

## 🎉 Pronto!

Agora você tem um sistema financeiro completo com:
- Controle de gastos (Orçamentos)
- Planejamento financeiro (Metas)
- Gestão de investimentos (Carteira)
- E muito mais!

Aproveite! 🚀
