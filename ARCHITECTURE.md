# Mapa de Arquitetura: Seu Bolso Inteligente

> Este documento é o "Mapa do Tesouro" do projeto. Todo agente de Inteligência Artificial deve ler este documento antes de sugerir ou implementar qualquer lógica, banco de dados ou tela.

## 1. Stack Tecnológica
- **Frontend:** React 18, Vite, TypeScript (Strict Mode).
- **Estilização:** Tailwind CSS (Vanguarda).
- **Componentes / UI:** Radix UI primitives.
- **Gerenciamento de Estado/Cache:** React Query (@tanstack/react-query).
- **Tratamento de Dados/Formulários:** Zod para schemas, `date-fns` para tratamento de tempo (fuso horário local/UTC), `decimal.js` para cálculos financeiros precisos.
- **Backend/DB:** Supabase (PostgreSQL).

## 2. Padrões de Código e UX
- **Design System:** Priorizar uma interface operacional, responsiva e mobile first. A UI deve transmitir confiança por clareza, hierarquia, densidade controlada e consistência. Gradientes, blur e animações são recursos de exceção, não a base visual do produto.
- **Sem Gambiarras e DRY Absoluto:** Nenhuma lógica deve ser repetida. Usar hooks (`src/hooks`) ou utils (`src/utils`).
- **Validação Antecipada:** Todos os formulários têm verificação antes de chegar ao banco. Redes protegidas contra Spams através de Debounce e Throttle.
- **Proteção Visual:** Sempre exibir botões desabilitados (`disabled={isLoading}`) ou skeletons de carregamento durante as chamadas de rede.

## 3. Arquitetura de Dados (PostgreSQL / Supabase)
O PostgreSQL do Supabase é a fonte única de verdade financeira. Cache local, estado de tela e dados persistidos pelo React Query são cópias derivadas e descartáveis. Nenhuma tela pode manter um livro-caixa paralelo.

O banco de dados passou por dezenas de iterações de regras de negócio. Nunca crie chaves estrangeiras sem índices e nunca altere lógicas sem preservar dados via `Soft Deletes`. 
As lógicas principais no banco são:
- **Transações Financeiras e Categorias Hierárquicas:** Contém histórico vital do usuário. Nunca apague dados, use arquitetura Soft Delete / Archiving.
- **Fechamento e Ciclos (Faturas de Cartão):** Tratamento rigoroso de *data de competência* versus *data de vencimento*. Cuidado extremo ao gerar projeções mensais, fluxos futuros e fechamento de faturas baseados nessas datas.
- **Gastos Compartilhados e Acertos (Settlements):** Ciclos híbridos e lógicas avançadas de acertos (splits de contas) rodando em RPCs customizadas do banco (Stored Procedures). Não tente replicar essas contas complexas no JavaScript do Frontend; chame o RPC correto do Supabase.
- **Auditoria, Segurança e Logs:** Atividades dos usuários possuem rastreio, políticas de RLS (Row Level Security) estão ativas e com verificações estritas.

## 4. Estrutura de Diretórios Crítica (`src/`)
- `/components`: UI limpa e isolada. Se passar de 200 linhas, quebre em sub-componentes.
- `/pages`: Telas principais e orquestradoras (Dashboard, Reports, Tripe/Viagens, CreditCards, SharedExpenses).
- `/contexts` & `/hooks`: Estado compartilhado globalmente. Proibido usar Prop Drilling em mais de 2 níveis.
- `/services` & `/integrations`: Comunicação externa e consultas ao Supabase.

## 5. Regras Monetárias e Leis de Confiabilidade
> [!WARNING]  
> **A Lei da Precisão Financeira:** Nunca use tipos *float* puros no JavaScript ou SQL para contas financeiras, a não ser como aproximação estética. Use sempre `Decimal.js` (ou `BigInt` em centavos) quando estiver programando as lógicas transacionais para evitar o "sumiço de centavos" nos arredondamentos, e preserve estritamente o modelo de dados e constraints do Supabase.

## 6. Contrato de Produto

O produto é um sistema de controle financeiro pessoal manual, sem conexão bancária ou iniciação de pagamentos. Importações OFX/CSV são entradas assistidas e devem passar pelas mesmas regras de validação, deduplicação e auditoria das entradas manuais.

O contrato completo e o protocolo de coordenação estão em `docs/PRODUCT_OPERATING_MODEL.md`.
