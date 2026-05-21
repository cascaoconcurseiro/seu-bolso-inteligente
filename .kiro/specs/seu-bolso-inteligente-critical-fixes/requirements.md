# Documento de Requisitos: Correção de Problemas Críticos do Seu Bolso Inteligente

## Introdução

Este documento especifica requisitos para corrigir 20 problemas de severidade crítica, alta, média e baixa identificados no sistema de gerenciamento financeiro Seu Bolso Inteligente. Os problemas abrangem quatro áreas principais: infraestrutura de testes, qualidade do código de produção, integridade de dados e confiabilidade do sistema. Essas correções são essenciais para garantir que o sistema funcione corretamente, mantenha consistência de dados e forneça uma experiência confiável para usuários que gerenciam finanças compartilhadas, parcelamentos e liquidações.

## Glossário

- **SafeFinancialCalculator**: Uma classe utilitária que realiza cálculos financeiros usando aritmética de inteiros (centavos) para evitar erros de precisão em ponto flutuante
- **Transaction**: Um registro financeiro representando uma despesa, receita ou transferência
- **Split**: Uma divisão do valor de uma transação entre múltiplos membros da família para despesas compartilhadas
- **Parcelamento**: O processo de dividir uma transação em múltiplas parcelas ao longo do tempo
- **Settlement**: O processo de marcar uma despesa compartilhada como paga/resolvida
- **Competence_Date**: A data baseada em mês (YYYY-MM-01) usada para agrupar transações por seu período contábil
- **Payer_ID**: O ID do membro da família da pessoa que pagou uma despesa compartilhada em nome de outros
- **Atomicity**: A propriedade de que uma série de operações de banco de dados ou todas têm sucesso ou todas falham juntas
- **RPC**: Remote Procedure Call - uma função de banco de dados executada no servidor
- **Console_Log**: Saída direta para o console do navegador (não deve aparecer em código de produção)
- **Timezone_Issue**: Manipulação incorreta de datas que não leva em conta diferenças de UTC ou fuso horário local
- **N+1_Query**: Um problema de desempenho onde uma consulta é seguida por muitas consultas adicionais em um loop
- **Type_Safety**: O uso de tipos específicos em vez de `any` para capturar erros em tempo de compilação
- **Input_Validation**: Verificação de que dados fornecidos pelo usuário atendem às restrições esperadas antes do processamento
- **RLS**: Row-Level Security - políticas de banco de dados que restringem acesso a dados com base na identidade do usuário

## Requisitos

### Requisito 1: Estabelecer Infraestrutura de Testes Automatizados

**História do Usuário:** Como desenvolvedor, quero testes automatizados para cálculos financeiros críticos, para que eu possa garantir que o sistema manipula corretamente o dinheiro e previne erros financeiros.

#### Critérios de Aceitação

1. QUANDO a suite de testes é executada, O Framework_de_Testes DEVE executar todos os testes e relatar status de sucesso/falha
2. QUANDO métodos do SafeFinancialCalculator são chamados, A Suite_de_Testes DEVE verificar que cálculos mantêm precisão de 2 casas decimais
3. QUANDO splits de transações são criados, A Suite_de_Testes DEVE verificar que valores de splits somam o total da transação (tolerância de 1 centavo)
4. QUANDO parcelas são calculadas, A Suite_de_Testes DEVE verificar que cada valor de parcela está correto e o total iguala o valor original
5. QUANDO operações de liquidação ocorrem, A Suite_de_Testes DEVE verificar que transições de estado de liquidação são válidas
6. A Suite_de_Testes DEVE alcançar cobertura mínima de 80% para SafeFinancialCalculator, lógica de splits e operações de liquidação
7. ONDE testes baseados em propriedades são aplicáveis, A Suite_de_Testes DEVE usar testes baseados em propriedades para verificar invariantes em entradas aleatórias

**Arquivos Afetados:**
- src/services/SafeFinancialCalculator.ts (sem testes atualmente)
- src/hooks/useTransactions.ts (lógica de criação de splits, linhas 380-540)
- src/hooks/useSettlement.ts (operações de liquidação, linhas 1-300)
- src/lib/invoiceUtils.ts (cálculos de fatura, linhas 40-90)

**Propriedades de Correção:**
- **Invariante**: Soma de valores de splits ≤ valor da transação + 1 centavo (tolerância de arredondamento)
- **Round-Trip**: `SafeFinancialCalculator.add(a, b) - b === a` (inverso de subtração)
- **Idempotência**: Marcar um split como liquidado duas vezes produz o mesmo resultado que uma vez
- **Metamórfica**: `SafeFinancialCalculator.safeSum(splits) ≤ total` sempre se mantém

---

### Requisito 2: Remover Logs de Console do Código de Produção

**História do Usuário:** Como engenheiro de operações, quero que o código de produção use logging estruturado, para que eu possa monitorar o sistema sem spam de console e integrar com serviços de logging.

#### Critérios de Aceitação

1. QUANDO a aplicação é executada em produção, O Sistema NÃO DEVE gerar nenhuma instrução console.log
2. QUANDO um desenvolvedor precisa fazer debug, O Sistema DEVE usar o utilitário de logger centralizado (src/utils/logger.ts)
3. QUANDO o logger é chamado, O Logger DEVE gerar saída apenas em modo de desenvolvimento (verificação isDev)
4. O Sistema DEVE remover todas as chamadas diretas console.log de: useTransactions.ts, useSharedFinances.ts, useSettlement.ts, auditLog.ts, useCategories.ts, useAnticipateInstallments.ts, useAccountStatement.ts
5. ONDE instruções console.log existem para debug, O Desenvolvedor DEVE substituí-las por chamadas logger.debug()
6. ONDE instruções console.error existem, O Desenvolvedor DEVE substituí-las por chamadas logger.error()

**Arquivos Afetados:**
- src/hooks/useTransactions.ts (linhas 428, 451, 461, 486, 505, 515, 535, 583, 595)
- src/hooks/useSharedFinances.ts (múltiplas instruções console.log no cálculo de fatura)
- src/hooks/useSettlement.ts (linha 282)
- src/services/auditLog.ts (linhas 89, 120, 289, 332)
- src/hooks/useCategories.ts (linha 191)
- src/hooks/useAnticipateInstallments.ts (linhas 47, 68, 81, 128, 141, 150)
- src/hooks/useAccountStatement.ts (linhas 51, 59)

**Propriedades de Correção:**
- **Invariante**: Nenhuma chamada console.log/warn/error em builds de produção
- **Idempotência**: Substituir console.log por logger.debug produz o mesmo comportamento em modo dev

---

### Requisito 3: Corrigir Problemas de Fuso Horário na Lógica de Parcelamento

**História do Usuário:** Como usuário em diferentes fusos horários, quero que datas de parcelas sejam calculadas corretamente independentemente do meu fuso horário local, para que meu cronograma de pagamento seja preciso.

#### Critérios de Aceitação

1. QUANDO uma série de parcelas é criada, O Sistema DEVE usar a biblioteca date-fns para todos os cálculos de data
2. QUANDO datas de parcelas são calculadas, O Sistema DEVE usar aritmética de data baseada em UTC (não construtor Date local)
3. QUANDO strings de data (formato YYYY-MM-DD) são analisadas, O Sistema DEVE usar dateFns.parseISO() para evitar ambiguidade de fuso horário
4. QUANDO datas são formatadas para armazenamento, O Sistema DEVE usar dateFns.format() com padrão 'yyyy-MM-dd'
5. QUANDO competence_date (bucket de mês) é calculada, O Sistema DEVE usar dateFns.format(date, 'yyyy-MM-01')
6. O Sistema NÃO DEVE usar construtor `new Date()` para aritmética de data na lógica de parcelamento
7. QUANDO parcelas são criadas, O Sistema DEVE verificar que cada parcela tem data e competence_date corretas

**Arquivos Afetados:**
- src/hooks/useTransactions.ts (linhas 380-430, lógica de criação de parcelas)
- src/lib/invoiceUtils.ts (linhas 20-50, análise e formatação de data)
- src/hooks/useSharedFinances.ts (linhas 80-120, cálculo de data de exibição)

**Propriedades de Correção:**
- **Invariante**: `competence_date` sempre iguala primeiro dia do mês (YYYY-MM-01)
- **Round-Trip**: `parseISO(format(date, 'yyyy-MM-dd')) === date` (consistência de formato de data)
- **Idempotência**: Calcular datas de parcelas múltiplas vezes produz o mesmo resultado

---

### Requisito 4: Validar ID do Pagador Antes de Criar Splits

**História do Usuário:** Como administrador do sistema, quero que IDs de pagador inválidos sejam rejeitados antes de qualquer mudança no banco de dados, para que o sistema mantenha integridade referencial e previna registros órfãos.

#### Critérios de Aceitação

1. QUANDO uma transação com payer_id é criada, O Sistema DEVE validar que payer_id existe na tabela family_members ANTES de criar splits
2. SE a validação de payer_id falhar, O Sistema DEVE lançar um erro e NÃO criar nenhum split ou registro de transação
3. QUANDO payer_id é fornecido, O Sistema DEVE consultar a tabela family_members com correspondência exata na coluna id
4. SE payer_id não existe, O Sistema DEVE retornar erro descritivo: "O pagador selecionado é inválido ou não foi encontrado."
5. O Sistema DEVE realizar esta validação na mutação useCreateTransaction antes de qualquer operação de banco de dados
6. ONDE payer_id é null ou undefined, O Sistema DEVE pular validação (campo opcional)

**Arquivos Afetados:**
- src/hooks/useTransactions.ts (linhas 310-330, mutação useCreateTransaction)

**Propriedades de Correção:**
- **Invariante**: Toda transação com payer_id tem registro correspondente de family_member
- **Idempotência**: Validar payer_id múltiplas vezes produz o mesmo resultado

---

### Requisito 5: Implementar Operações de Liquidação Atômicas

**História do Usuário:** Como usuário, quero que operações de liquidação sejam tudo-ou-nada, para que se algo falhar no meio da operação, o sistema não deixe dados em estado inconsistente.

#### Critérios de Aceitação

1. QUANDO uma liquidação é criada, O Sistema DEVE envolver todas as operações de banco de dados em uma única transação
2. QUANDO um split é marcado como liquidado, O Sistema DEVE atualizar registro de split E criar transação de pagamento E atualizar saldo da conta em uma operação atômica
3. SE qualquer operação na liquidação falhar, O Sistema DEVE fazer rollback de todas as mudanças (sem atualizações parciais)
4. QUANDO múltiplos splits são liquidados, O Sistema DEVE usar uma única transação para todos os splits e registros de pagamento
5. O Sistema DEVE usar funções RPC do Supabase (settle_split, settle_multiple_splits) que implementam lógica de transação no servidor
6. SE uma operação de liquidação falhar, O Sistema DEVE registrar o erro e retornar mensagem descritiva ao usuário
7. QUANDO uma liquidação é revertida, O Sistema DEVE atomicamente reverter todas as mudanças relacionadas (status de split, transação de pagamento, saldo da conta)

**Arquivos Afetados:**
- src/hooks/useSettlement.ts (linhas 1-100, mutação useSettleWithPayment)
- src/hooks/useSettlement.ts (linhas 110-160, mutação useSettleMultipleWithPayment)
- src/hooks/useSettlement.ts (linhas 170-250, mutação useUnsettleWithReversal)
- Funções RPC do banco de dados: settle_split, settle_multiple_splits

**Propriedades de Correção:**
- **Invariante**: Se liquidação tem sucesso, split.is_settled=true E transação de pagamento existe E saldo da conta atualizado
- **Idempotência**: Liquidar mesmo split duas vezes produz erro na segunda tentativa (já liquidado)
- **Confluência**: Ordem de liquidação de múltiplos splits não afeta estado final

---

### Requisito 6: Adicionar Segurança de Tipo em Todo o Código

**História do Usuário:** Como desenvolvedor, quero que o código use tipos específicos em vez de `any`, para que TypeScript possa capturar erros em tempo de compilação e prevenir bugs em tempo de execução.

#### Critérios de Aceitação

1. QUANDO o compilador TypeScript é executado, O Sistema DEVE ter zero instâncias de tipo `any` em arquivos críticos
2. QUANDO parâmetros de função são definidos, O Sistema DEVE usar tipos específicos em vez de `any`
3. QUANDO propriedades de objeto são acessadas, O Sistema DEVE usar interfaces tipadas em vez de `any`
4. O Sistema DEVE substituir tipos `any` em: useSharedExpensesActions.ts, useAccounts.ts, notificationGenerator.ts
5. ONDE dados externos são recebidos, O Sistema DEVE definir interfaces explícitas correspondendo à estrutura de dados
6. QUANDO consultas de banco de dados retornam dados, O Sistema DEVE usar definições de tipo Database de types/database.ts

**Arquivos Afetados:**
- src/hooks/useSharedExpensesActions.ts (múltiplos tipos `any`)
- src/hooks/useAccounts.ts (múltiplos tipos `any`)
- src/services/notificationGenerator.ts (múltiplos tipos `any`)

**Propriedades de Correção:**
- **Invariante**: Modo strict do TypeScript passa com zero tipos `any` em caminhos críticos

---

### Requisito 7: Implementar Tratamento de Erro RPC Consistente e Lógica de Retry

**História do Usuário:** Como usuário, quero que chamadas RPC tratem falhas graciosamente com retries, para que problemas temporários de rede não causem falhas de transação.

#### Critérios de Aceitação

1. QUANDO uma chamada RPC falha, O Sistema DEVE fazer retry até 3 vezes com backoff exponencial
2. QUANDO uma chamada RPC falha após retries, O Sistema DEVE retornar mensagem de erro descritiva ao usuário
3. QUANDO uma chamada RPC expira, O Sistema DEVE tratar como erro retriável e fazer retry
4. O Sistema DEVE registrar todas as falhas de RPC com código de erro e contexto para debug
5. QUANDO liquidando transações via RPC, O Sistema DEVE implementar lógica de retry nos hooks useSettlement
6. ONDE chamadas RPC são feitas, O Sistema DEVE envolvê-las em blocos try-catch com tratamento de erro apropriado
7. SE uma chamada RPC falha, O Sistema NÃO DEVE atualizar parcialmente estado local

**Arquivos Afetados:**
- src/hooks/useSettlement.ts (chamadas RPC para settle_split, settle_multiple_splits)
- src/hooks/useTransactions.ts (chamadas RPC para get_shared_invoice_data, get_monthly_financial_summary)
- src/hooks/useSharedFinances.ts (chamada RPC para get_shared_invoice_data)

**Propriedades de Correção:**
- **Idempotência**: Fazer retry de chamadas RPC falhadas produz o mesmo resultado que primeira tentativa
- **Invariante**: Falhas de RPC não deixam sistema em estado inconsistente

---

### Requisito 8: Habilitar e Testar Categorização Automática

**História do Usuário:** Como usuário, quero que transações sejam automaticamente categorizadas, para que eu não tenha que atribuir categorias manualmente a cada transação.

#### Critérios de Aceitação

1. QUANDO uma transação é criada, O Sistema DEVE tentar categorizá-la automaticamente baseado na descrição
2. QUANDO categorização automática é habilitada, O Sistema DEVE usar a lógica de categorização em useTransactions
3. SE categorização automática falha, O Sistema DEVE registrar o erro mas NÃO bloquear criação de transação
4. QUANDO categorização automática tem sucesso, O Sistema DEVE atribuir category_id à transação
5. O Sistema DEVE testar categorização automática com várias descrições de transação
6. ONDE lógica de categorização foi desabilitada devido a erros de produção, O Sistema DEVE identificar e corrigir a causa raiz
7. QUANDO categorização é incerta, O Sistema DEVE deixar category_id null e permitir usuário atribuir manualmente

**Arquivos Afetados:**
- src/hooks/useTransactions.ts (lógica de categorização)
- src/services/categorizationEngine.ts (se existe)

**Propriedades de Correção:**
- **Idempotência**: Categorizar mesma transação múltiplas vezes produz o mesmo resultado
- **Invariante**: Categorização nunca bloqueia criação de transação

---

### Requisito 9: Fortalecer Validação de Entrada em Formulários

**História do Usuário:** Como usuário, quero que validação de formulário capture erros antes da submissão, para que eu não desperdice tempo com requisições falhadas.

#### Critérios de Aceitação

1. QUANDO um formulário é submetido, O Sistema DEVE validar que todos os campos obrigatórios estão presentes
2. QUANDO valor é inserido, O Sistema DEVE validar que é um número positivo
3. QUANDO descrição é inserida, O Sistema DEVE validar que não é vazia ou apenas espaços em branco
4. QUANDO data é inserida, O Sistema DEVE validar que é uma data válida em formato YYYY-MM-DD
5. QUANDO conta é selecionada, O Sistema DEVE validar que account_id existe e pertence ao usuário atual
6. QUANDO categoria é selecionada, O Sistema DEVE validar que category_id existe e pertence ao usuário atual
7. QUANDO splits são criados, O Sistema DEVE validar que percentuais de split somam 100% (ou menos se auto-completando)
8. QUANDO pagador é selecionado, O Sistema DEVE validar que payer_id existe em family_members
9. O Sistema DEVE exibir mensagens de erro claras para cada falha de validação

**Arquivos Afetados:**
- src/pages/CreditCards.tsx (validação de formulário)
- src/pages/AccountDetail.tsx (validação de formulário)
- src/pages/Accounts.tsx (validação de formulário)
- src/hooks/useTransactions.ts (validação em useCreateTransaction)

**Propriedades de Correção:**
- **Invariante**: Nenhum dado inválido atinge banco de dados (toda validação acontece antes da submissão)

---

### Requisito 10: Adicionar Testes Abrangentes para Lógica de Finanças Compartilhadas

**História do Usuário:** Como desenvolvedor, quero que lógica de finanças compartilhadas seja completamente testada, para que eu possa fazer mudanças com confiança sem quebrar cálculos de splits.

#### Critérios de Aceitação

1. QUANDO transações compartilhadas são carregadas, A Suite_de_Testes DEVE verificar que splits são calculados corretamente
2. QUANDO um usuário é adicionado a um split, A Suite_de_Testes DEVE verificar que seu valor está correto
3. QUANDO múltiplos splits existem, A Suite_de_Testes DEVE verificar que total iguala valor da transação
4. QUANDO status de liquidação muda, A Suite_de_Testes DEVE verificar que transições de estado são válidas
5. QUANDO filtrando faturas por membro, A Suite_de_Testes DEVE verificar que itens corretos são retornados
6. QUANDO calculando totais por moeda, A Suite_de_Testes DEVE verificar que valores estão corretos por moeda
7. A Suite_de_Testes DEVE testar casos extremos: valores zero, membro único, múltiplas moedas, liquidado vs não liquidado

**Arquivos Afetados:**
- src/hooks/useSharedFinances.ts (lógica de cálculo de fatura, linhas 100-300)

**Propriedades de Correção:**
- **Invariante**: Soma de valores de splits ≤ valor da transação + 1 centavo
- **Round-Trip**: Criar split então ler de volta produz mesmos dados
- **Idempotência**: Filtrar faturas múltiplas vezes produz o mesmo resultado

---

### Requisito 11: Validar ID de Membro Antes de Criar Splits

**História do Usuário:** Como administrador do sistema, quero que IDs de membro inválidos sejam rejeitados antes de splits serem criados, para que o sistema mantenha integridade referencial.

#### Critérios de Aceitação

1. QUANDO um split é criado, O Sistema DEVE validar que member_id existe na tabela family_members
2. SE validação de member_id falha, O Sistema DEVE lançar um erro e NÃO criar o split
3. QUANDO member_id é fornecido, O Sistema DEVE consultar tabela family_members com correspondência exata na coluna id
4. SE member_id não existe, O Sistema DEVE retornar mensagem de erro descritiva
5. O Sistema DEVE realizar esta validação ANTES de inserir em tabela transaction_splits
6. ONDE member_id é um user_id (para transações de viagem), O Sistema DEVE validar que existe em tabela auth.users

**Arquivos Afetados:**
- src/hooks/useTransactions.ts (linhas 450-510, lógica de criação de split)

**Propriedades de Correção:**
- **Invariante**: Todo split tem valid member_id em tabela family_members

---

### Requisito 12: Implementar Tratamento de Limite de Transações

**História do Usuário:** Como usuário, quero saber quando resultados de transações são truncados, para que eu possa ajustar filtros se necessário.

#### Critérios de Aceitação

1. QUANDO transações são buscadas, O Sistema DEVE limitar resultados a 1000 registros
2. QUANDO contagem de transações atinge 1000, O Sistema DEVE exibir mensagem de aviso ao usuário
3. A Mensagem_de_Aviso DEVE sugerir usar filtros de data para visualizar períodos menores
4. QUANDO usuário vê aviso, O Sistema NÃO DEVE silenciosamente truncar cálculos de saldo
5. O Sistema DEVE registrar quando limite de transação é atingido para monitoramento
6. ONDE limite de transação é atingido, O Sistema DEVE indicar isto na UI

**Arquivos Afetados:**
- src/hooks/useTransactions.ts (linhas 200-220, constante TRANSACTION_FETCH_LIMIT)

**Propriedades de Correção:**
- **Invariante**: Usuário sempre está ciente quando resultados são truncados

---

### Requisito 13: Otimizar Problemas de Consulta N+1

**História do Usuário:** Como usuário, quero que carregamento de transações seja rápido, para que a aplicação responda rapidamente.

#### Critérios de Aceitação

1. QUANDO transações são carregadas, O Sistema DEVE usar consultas em lote em vez de loops
2. QUANDO dados de transação são unidos com contas/categorias, O Sistema DEVE buscar todos dados relacionados em uma única consulta
3. QUANDO splits são carregados, O Sistema DEVE buscar todos splits para todas transações em uma consulta
4. O Sistema NÃO DEVE fazer consultas individuais para dados relacionados de cada transação
5. QUANDO desempenho é medido, O Sistema DEVE mostrar melhoria em contagem de consultas e tempo de resposta

**Arquivos Afetados:**
- src/hooks/useTransactions.ts (lógica de carregamento de transações)
- src/hooks/useSharedFinances.ts (carregamento de dados de fatura)

**Propriedades de Correção:**
- **Invariante**: Contagem de consultas é constante independentemente de contagem de transações (sem padrão N+1)

---

### Requisito 14: Implementar Invalidação de Cache Consistente

**História do Usuário:** Como usuário, quero que dados sejam frescos após operações, para que eu veja informações precisas imediatamente.

#### Critérios de Aceitação

1. QUANDO uma transação é criada, O Sistema DEVE invalidar todas as consultas relacionadas
2. QUANDO uma liquidação é confirmada, O Sistema DEVE invalidar consultas de transação, conta e resumo financeiro
3. QUANDO um split é atualizado, O Sistema DEVE invalidar consultas de finanças compartilhadas
4. O Sistema DEVE usar funções de invalidação centralizadas (invalidateTransactionQueries, invalidateFinancialQueries, invalidateSharedQueries)
5. QUANDO múltiplas operações ocorrem, O Sistema DEVE agrupar invalidações para evitar refetches excessivos
6. ONDE invalidação de cache está faltando, O Sistema DEVE adicioná-la para prevenir dados obsoletos

**Arquivos Afetados:**
- src/utils/queryInvalidation.ts (funções de invalidação)
- src/hooks/useTransactions.ts (manipuladores de sucesso de mutação)
- src/hooks/useSettlement.ts (manipuladores de sucesso de mutação)

**Propriedades de Correção:**
- **Invariante**: Após qualquer mutação, consultas afetadas são invalidadas
- **Idempotência**: Invalidar mesma consulta múltiplas vezes tem mesmo efeito que uma vez

---

### Requisito 15: Documentar Fluxos Complexos

**História do Usuário:** Como desenvolvedor, quero que fluxos complexos sejam documentados, para que eu possa entender e manter o código.

#### Critérios de Aceitação

1. QUANDO lendo código para finanças compartilhadas, O Desenvolvedor DEVE encontrar documentação clara do fluxo
2. QUANDO lendo código para liquidação, O Desenvolvedor DEVE encontrar documentação clara do fluxo
3. QUANDO lendo código para parcelamentos, O Desenvolvedor DEVE encontrar documentação clara do fluxo
4. A Documentação DEVE explicar o propósito de cada função principal
5. A Documentação DEVE explicar fluxo de dados e transformações
6. A Documentação DEVE incluir exemplos de operações típicas
7. ONDE lógica complexa existe, O Código DEVE incluir comentários inline explicando a lógica

**Arquivos Afetados:**
- src/hooks/useSharedFinances.ts (cálculo de fatura complexo)
- src/hooks/useSettlement.ts (fluxo de liquidação)
- src/hooks/useTransactions.ts (criação de parcelamento)

---

### Requisito 16: Implementar TODOs Faltantes

**História do Usuário:** Como desenvolvedor, quero que features incompletas sejam finalizadas, para que o sistema seja completamente funcional.

#### Critérios de Aceitação

1. QUANDO procurando codebase por comentários TODO, O Desenvolvedor DEVE identificar todas features incompletas
2. QUANDO um TODO é encontrado, O Desenvolvedor DEVE ou completá-lo ou criar uma tarefa para rastreá-lo
3. ONDE TODOs estão bloqueando funcionalidade, O Desenvolvedor DEVE priorizar completá-los
4. QUANDO um TODO é completado, O Desenvolvedor DEVE remover o comentário TODO

**Arquivos Afetados:**
- Todos os arquivos com comentários TODO

---

### Requisito 17: Limpar Código

**História do Usuário:** Como desenvolvedor, quero código limpo e mantível, para que o codebase seja fácil de trabalhar.

#### Critérios de Aceitação

1. QUANDO código é revisado, O Desenvolvedor DEVE remover variáveis e imports não utilizados
2. QUANDO código é revisado, O Desenvolvedor DEVE corrigir inconsistências de formatação
3. QUANDO código é revisado, O Desenvolvedor DEVE remover código comentado
4. QUANDO código é revisado, O Desenvolvedor DEVE simplificar expressões excessivamente complexas
5. O Código DEVE seguir guia de estilo do projeto e convenções

**Arquivos Afetados:**
- Todos os arquivos fonte

---

### Requisito 18: Adicionar Testes End-to-End

**História do Usuário:** Como engenheiro de QA, quero testes end-to-end para verificar fluxos de usuário completos, para que eu possa capturar problemas de integração.

#### Critérios de Aceitação

1. QUANDO um usuário cria uma despesa compartilhada, O Teste_E2E DEVE verificar que aparece em finanças compartilhadas
2. QUANDO um usuário liquida uma despesa, O Teste_E2E DEVE verificar que pagamento é registrado e saldo atualizado
3. QUANDO um usuário cria parcelamentos, O Teste_E2E DEVE verificar que todas parcelas são criadas com datas corretas
4. QUANDO um usuário filtra transações, O Teste_E2E DEVE verificar que resultados corretos são exibidos
5. Os Testes_E2E DEVEM cobrir caminho feliz e cenários de erro
6. Os Testes_E2E DEVEM usar dados de teste realistas

**Arquivos Afetados:**
- diretório e2e/ (novos arquivos de teste)

---

### Requisito 19: Adicionar Testes de Row-Level Security (RLS)

**História do Usuário:** Como engenheiro de segurança, quero que políticas RLS sejam testadas, para que eu possa verificar que usuários só acessam seus próprios dados.

#### Critérios de Aceitação

1. QUANDO um usuário consulta transações, A Política_RLS DEVE retornar apenas suas próprias transações
2. QUANDO um usuário consulta finanças compartilhadas, A Política_RLS DEVE retornar apenas transações que está envolvido
3. QUANDO um usuário tenta acessar dados de outro usuário, A Política_RLS DEVE negar acesso
4. QUANDO um usuário tenta modificar transação de outro usuário, A Política_RLS DEVE negar modificação
5. Os Testes_RLS DEVEM verificar que todas tabelas críticas têm políticas apropriadas
6. Os Testes_RLS DEVEM verificar que políticas funcionam corretamente com splits e liquidações

**Arquivos Afetados:**
- Políticas RLS do banco de dados
- Arquivos de teste para verificação de RLS

---

### Requisito 20: Remover Código Morto

**História do Usuário:** Como desenvolvedor, quero remover código não utilizado, para que o codebase seja menor e mais fácil de manter.

#### Critérios de Aceitação

1. QUANDO código é analisado, O Desenvolvedor DEVE identificar funções, variáveis e imports não utilizados
2. QUANDO código morto é encontrado, O Desenvolvedor DEVE removê-lo ou criar uma tarefa para rastreá-lo
3. QUANDO removendo código, O Desenvolvedor DEVE verificar que não é utilizado em outro lugar
4. O Codebase NÃO DEVE ter exports não utilizados ou caminhos de código morto

**Arquivos Afetados:**
- Todos os arquivos fonte

---

## Resumo

Estes 20 requisitos abordam problemas críticos em quatro níveis de severidade:

**CRÍTICO (5):** Infraestrutura de testes, logs de console, problemas de fuso horário, validação de pagador, atomicidade de liquidação
**ALTO (6):** Segurança de tipo, tratamento de erro RPC, categorização automática, validação de entrada, testes de finanças compartilhadas, validação de membro
**MÉDIO (5):** Limites de transação, consultas N+1, invalidação de cache, documentação, TODOs
**BAIXO (4):** Limpeza de código, testes E2E, testes RLS, remoção de código morto

Cada requisito é independente e testável, com critérios de aceitação claros e propriedades de correção que devem ser verificadas.
