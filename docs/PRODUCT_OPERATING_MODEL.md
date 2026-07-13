# Modelo operacional do produto

## Posicionamento

O Seu Bolso Inteligente e um sistema de controle financeiro pessoal sem conexao
bancaria. O usuario registra, importa e confirma seus proprios dados. O produto nao
deve sugerir que consulta saldo bancario, movimenta dinheiro ou possui Open Finance.

O sistema deve oferecer a confiabilidade esperada de um app financeiro real:

- contas, cartoes, receitas, despesas, transferencias e saldos;
- parcelas, recorrencias, faturas e datas de competencia;
- orcamentos, metas, patrimonio, compartilhamentos e acertos;
- viagens, anexos, importacao e exportacao;
- historico, auditoria, busca, filtros, offline controlado e recuperacao de erros.

## Fonte unica de verdade

O PostgreSQL do Supabase e a fonte canonica dos dados financeiros. Toda tela,
relatorio, saldo, fatura e cliente futuro deve derivar do mesmo modelo.

Regras obrigatorias:

1. Uma transacao financeira possui uma identidade canonica e nao e duplicada para
   atender telas diferentes.
2. Parcelas e recorrencias devem manter vinculo explicito com sua serie de origem.
3. Saldos e totais derivados nunca competem com a transacao de origem como fonte de
   verdade.
4. Cache local e React Query sao copias descartaveis, nunca um segundo banco.
5. Escritas financeiras criticas passam por RPCs atomicas, seguras e idempotentes.
6. Valores monetarios, moedas e datas seguem um contrato unico entre banco, Web/PWA
   e futuro cliente Swift.
7. Soft delete, auditoria e reconciliacao preservam rastreabilidade sem criar duas
   versoes ativas do mesmo fato financeiro.

## Limites do produto

- Sem conexao bancaria, iniciacao de pagamento ou promessa de saldo em tempo real.
- Importacoes OFX/CSV sao entradas manuais assistidas e exigem deduplicacao.
- O app pode calcular projecoes, mas deve distingui-las de fatos confirmados.
- Operacoes offline devem exibir estado pendente e usar chave de idempotencia ao
  sincronizar.

## Coordenacao por especialidade

Cada entrega relevante deve ser analisada pelas funcoes abaixo. Isso representa
criterios de revisao senior, nao aprovacoes ficticias de pessoas que nao revisaram o
codigo.

- Produto financeiro: jornada, escopo, consistencia e risco para o usuario.
- Arquitetura: fonte de verdade, contratos, acoplamento e evolucao para Swift.
- Supabase/Postgres: schema, RPC, RLS, concorrencia, indices e migracoes.
- Seguranca e privacidade: autorizacao, abuso, LGPD, logs e dados sensiveis.
- Frontend/PWA: estado, desempenho, offline, acessibilidade e resiliencia.
- UX e conteudo: compreensao, prevencao de erro e recuperacao.
- Design e direcao de arte: hierarquia, densidade, consistencia e confianca.
- QA: regressao, integracao, E2E e cenarios negativos.
- Operacoes: deploy, observabilidade, backup, rollback e suporte.

Quando criterios entrarem em conflito, a prioridade e: integridade financeira,
seguranca, recuperabilidade, clareza para o usuario, desempenho e acabamento visual.

## Handoff obrigatorio

Toda sessao com alteracao deve atualizar `HANDOFF.md` com:

- objetivo e comportamento esperado;
- diagnostico e causa raiz;
- decisoes e alternativas rejeitadas;
- arquivos, migracoes e servicos alterados;
- testes executados e resultados;
- impacto no Supabase e compatibilidade;
- riscos, pendencias e proximo passo concreto;
- commit, branch e estado da publicacao.

