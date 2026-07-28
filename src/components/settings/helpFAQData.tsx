 
 
import {
  Globe,
  RefreshCw,
  AlertCircle,
  Undo2,
  Sparkles,
  Calendar as CalendarIcon,
  Wallet as WalletIcon,
  Database,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category:
    | "general"
    | "shared"
    | "cards"
    | "goals"
    | "reports"
    | "investments"
    | "trips"
    | "security";
  keywords: string[];
}

export const faqs: FAQItem[] = [
  // ==========================================
  // === CATEGORIA: GERAL & CONTAS BANCÁRIAS ===
  // ==========================================
  {
    category: "general",
    keywords: ["cadastrar", "contas", "internacional", "dólar", "euro", "câmbio", "principal"],
    question: "1. Como cadastrar contas nacionais (BRL) e estrangeiras com câmbio automático?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          O <strong>Pé de Meia</strong> permite gerenciar contas nacionais e internacionais de
          forma integrada.
        </p>
        <div className="p-3 bg-muted rounded-xl border border-border">
          <span className="font-semibold text-foreground flex items-center gap-2 mb-1 text-sm text-primary">
            <Globe className="h-3.5 w-3.5" /> Conversão Automatizada
          </span>
          Todos os saldos de contas internacionais são convertidos automaticamente para a sua
          moeda principal no Dashboard, consultando taxas de câmbio de mercado atualizadas em
          tempo real.
        </div>
        <p className="font-medium text-foreground">Passo a passo para cadastro:</p>
        <ol className="list-decimal pl-4 space-y-2 text-sm">
          <li>
            Navegue até a página de <strong>Contas e Cartões</strong> no menu lateral.
          </li>
          <li>
            Clique no botão <strong>Nova Conta</strong>.
          </li>
          <li>Insira o nome (ex: &quot;Wise USD&quot; ou &quot;Banco do Brasil&quot;).</li>
          <li>
            Para contas internacionais, ative o seletor <em>&quot;Conta Internacional&quot;</em> e
            selecione a moeda correspondente (USD, EUR, etc.).
          </li>
          <li>Digite o saldo inicial disponível e clique em **Salvar**.</li>
        </ol>
      </div>
    ),
  },
  {
    category: "general",
    keywords: ["saldo", "inicial", "ajustar", "editar", "diferença", "extrato"],
    question: "2. Meu saldo não bate com o extrato real do meu banco. O que devo fazer?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Se houver divergência entre o saldo exibido no aplicativo e o saldo da sua conta real,
          isso pode ser corrigido rapidamente de duas formas:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="p-3 bg-primary/5 rounded-xl border border-primary/10">
            <strong className="text-foreground block mb-1">
              Método A: Ajustar o Saldo Inicial (Recomendado)
            </strong>
            Vá em <strong>Contas e Cartões</strong>, identifique a conta e clique no botão
            **Editar** (lápis). Atualize o valor no campo *&quot;Saldo Inicial&quot;*. O sistema
            reprocessará matematicamente todo o histórico em cascata instantaneamente.
          </li>
          <li className="p-3 bg-primary/5 rounded-xl border border-primary/10">
            <strong className="text-foreground block mb-1">
              Método B: Lançar uma Transação de Ajuste
            </strong>
            Caso a divergência tenha sido causada por uma compra antiga esquecida, crie uma
            transação do tipo **Ajuste de Saldo** (Receita ou Despesa) para equalizar os centavos
            com o extrato.
          </li>
        </ul>
      </div>
    ),
  },
  {
    category: "general",
    keywords: ["transferência", "entre contas", "não duplicar", "transferir"],
    question:
      "3. Como registrar transferências entre minhas próprias contas sem duplicar despesas?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Quando você transfere dinheiro entre suas próprias contas (ex: tirando da Conta Corrente
          e mandando para a Poupança), isso **não é uma despesa nem uma receita**, mas sim uma
          movimentação patrimonial interna.
        </p>
        <div className="p-3 bg-muted rounded-xl border border-border">
          <span className="font-semibold text-foreground flex items-center gap-2 mb-1 text-sm">
            <RefreshCw className="h-3.5 w-3.5 text-primary" /> Como lançar uma transferência:
          </span>
          Ao criar uma nova transação, mude o tipo para <strong>Transferência</strong>. Você
          deverá indicar a **Conta de Origem** (de onde sai o dinheiro) e a **Conta de Destino**
          (para onde vai o dinheiro).
        </div>
        <p className="text-sm">
          O Pé de Meia deduzirá o saldo da conta de origem e somará na de destino de forma atômica
          em uma única operação, impedindo que o valor seja contabilizado como despesa nos seus
          gráficos mensais.
        </p>
      </div>
    ),
  },
  {
    category: "general",
    keywords: ["excluir", "desativar", "conta", "impacto", "histórico"],
    question:
      "4. Posso excluir uma conta bancária? O que acontece com o histórico de transações dela?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Sim, você pode excluir qualquer conta bancária cadastrada. No entanto, por razões de
          integridade do Banco de Dados (DBA) e segurança matemática, é importante entender as
          regras:
        </p>
        <div className="p-3 bg-destructive/5 rounded-xl border border-destructive/10 text-sm space-y-2.5">
          <strong className="text-foreground flex items-center gap-1 text-destructive font-semibold">
            <AlertCircle className="h-3.5 w-3.5" /> Atenção Contábil Crítica
          </strong>
          <p>
            Ao excluir fisicamente uma conta, **todas as transações e históricos vinculados a ela
            também serão excluídos permanentemente**. Isso alterará o seu histórico financeiro de
            meses anteriores nos relatórios de DRE e evolução patrimonial.
          </p>
          <p className="font-medium text-foreground mt-1">💡 Alternativa Segura:</p>
          <p>
            Se a conta apenas deixou de ser usada, sugerimos editar o nome dela adicionando um
            sufixo (ex: &quot;Itaú [INATIVO]&quot;) e manter o saldo zerado, preservando todo o
            seu histórico fiscal e DRE intocados.
          </p>
        </div>
      </div>
    ),
  },
  {
    category: "general",
    keywords: ["categorias", "personalizar", "subcategorias", "criar categoria"],
    question: "5. Como criar, editar ou gerenciar minhas categorias de transação?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          As categorias ajudam você a enxergar exatamente para onde vai o seu dinheiro. O Pé de
          Meia possui um conjunto padrão completo (Alimentação, Moradia, Transporte, etc.), mas
          você pode customizá-las:
        </p>
        <ol className="list-decimal pl-4 space-y-2 text-sm">
          <li>
            Vá em <strong>Configurações</strong> no menu lateral e selecione a aba **Categorias**.
          </li>
          <li>
            Para criar, clique em **Nova Categoria**, escolha um nome, cor personalizada e o ícone
            representativo.
          </li>
          <li>
            Para gerenciar as subcategorias existentes, selecione a categoria principal e adicione
            novos itens (ex: em &quot;Habitação&quot;, adicione &quot;Condomínio&quot; ou
            &quot;Manutenção&quot;).
          </li>
        </ol>
      </div>
    ),
  },
  {
    category: "general",
    keywords: ["tags", "etiquetas", "subcategoria", "filtrar"],
    question: "6. O que são as Tags de transações e como utilizá-las de forma estratégica?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Diferente das Categorias (que definem *o que* você comprou), as **Tags (etiquetas)**
          definem *por que* ou *em qual contexto* você gastou.
        </p>
        <div className="p-3 bg-muted rounded-xl border border-border text-sm space-y-2">
          <span className="font-semibold text-foreground block">
            💡 Exemplos de Tags Estratégicas:
          </span>
          <ul className="list-disc pl-4 space-y-2">
            <li>
              Tag `#reforma`: Use em despesas de Alimentação (almoço de pedreiros) e Habitação
              (cimento), para saber o custo total consolidado da obra.
            </li>
            <li>
              Tag `#blackfriday`: Para rastrear compras impulsivas ou planejadas em datas
              comerciais especiais.
            </li>
            <li>Tag `#trabalho`: Para sinalizar despesas reembolsáveis pela sua empresa.</li>
          </ul>
        </div>
        <p className="text-sm">
          Você pode atribuir múltiplas tags a uma única transação e filtrá-las de forma avançada
          no seu extrato e relatórios de fluxo de caixa.
        </p>
      </div>
    ),
  },

  // ==========================================
  // === CATEGORIA: GRUPOS E COMPARTILHADAS ===
  // ==========================================
  {
    category: "shared",
    keywords: ["compensação", "netting", "despesas compartilhadas", "acerto", "dividir"],
    question: "7. Como funciona a Compensação Automática de Saldos de forma matemática?",
    answer: (
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          A **Compensação Automática de Saldos (Netting)** é uma das lógicas mais avançadas e
          elogiadas do Pé de Meia. Ela consolida todas as dívidas e créditos cruzados entre duas
          pessoas e resume tudo a uma única transação de menor valor possível.
        </p>

        <div className="p-4 bg-success/5 rounded-xl border border-success/20 space-y-2.5 text-sm">
          <strong className="text-foreground flex items-center gap-2 text-success font-semibold">
            📝 Exemplo Matemático Didático:
          </strong>
          <p>Imagine o seguinte cenário de despesas mútuas acumuladas com o seu familiar:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            <div className="p-2.5 bg-background dark:bg-card rounded-lg border border-border">
              <span className="text-sm uppercase font-bold text-destructive">
                Você deve a ele:
              </span>
              <p className="font-mono font-bold text-sm">R$ 150,00</p>
              <span className="text-sm text-muted-foreground block">
                (ex: Supermercado que ele pagou inteiro)
              </span>
            </div>
            <div className="p-2.5 bg-background dark:bg-card rounded-lg border border-border">
              <span className="text-sm uppercase font-bold text-success">Ele deve a você:</span>
              <p className="font-mono font-bold text-sm">R$ 100,00</p>
              <span className="text-sm text-muted-foreground block">
                (ex: Conta de luz que você pagou inteiro)
              </span>
            </div>
          </div>
          <p className="pt-1.5 leading-relaxed">
            Sem o Pé de Meia, você teria que enviar um PIX de R$ 150,00 e ele um PIX de R$ 100,00.
            O sistema calcula a diferença e resolve tudo:
          </p>
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 font-mono text-center text-sm font-bold text-primary">
            R$ 150,00 (Devido) - R$ 100,00 (A Receber) = R$ 50,00 Saldo Devedor Líquido
          </div>
          <p>
            O sistema liquida todas as despesas antigas de ambas as partes automaticamente e gera
            **apenas uma única despesa real de R$ 50,00** para você pagar a ele.
          </p>
        </div>
      </div>
    ),
  },
  {
    category: "shared",
    keywords: ["acerto simples", "mão única", "sem compensação", "pagamento"],
    question: "8. O que é o Acerto Simples e em que ele difere da Compensação?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          O **Acerto Simples** ocorre quando o fluxo de dívida é unilateral, ou seja, de **mão
          única**.
        </p>
        <div className="p-3 bg-muted rounded-xl border border-border text-sm space-y-2">
          <span className="font-semibold text-foreground block">💡 Exemplo Prático:</span>
          Se você deve R$ 150,00 para o Auditor, mas o Auditor **não deve absolutamente nada**
          para você, não existe encontro de contas a ser feito.
        </div>
        <p className="text-sm">
          Nesse caso, o Pé de Meia detecta de forma inteligente essa ausência de créditos
          recíprocos e remove o termo &quot;por compensação&quot; das telas e extratos. A
          transação gerada para quitar a pendência será rotulada de forma contábil limpa e exata
          como **&quot;Pagamento de acerto para Auditor&quot;** (ou recebimento).
        </p>
      </div>
    ),
  },
  {
    category: "shared",
    keywords: ["desfazer acerto", "cancelar acerto", "estornar acerto", "splits"],
    question: "9. Fiz um acerto de contas por engano. Como desfazê-lo no sistema?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Se você clicou em liquidar e registrar acerto acidentalmente, o Pé de Meia possui um
          mecanismo de rollback de transações financeiras para evitar que você perca o controle
          das despesas originais:
        </p>
        <div className="p-3 bg-muted rounded-xl border border-border text-sm space-y-2">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-primary" /> Como reverter o acerto:
          </span>
          <ol className="list-decimal pl-4 space-y-2">
            <li>
              Vá até a sua lista de **Transações** e localize o lançamento correspondente ao
              pagamento ou recebimento do acerto.
            </li>
            <li>Exclua a transação de acerto.</li>
            <li>
              O sistema detectará automaticamente o vínculo e **reabrirá** instantaneamente todas
              as despesas divididas e splits originais que haviam sido liquidados por aquele
              acerto, retornando o saldo devedor e credor exatamente ao estado anterior.
            </li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    category: "shared",
    keywords: ["grupo familiar", "convite", "e-mail", "entrar no grupo"],
    question: "10. Como convidar membros para o meu Grupo Familiar no sistema?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          O grupo familiar serve para compartilhar de forma segura o orçamento doméstico. Para
          adicionar alguém:
        </p>
        <ol className="list-decimal pl-4 space-y-2.5 text-sm">
          <li>
            Acesse a página de <strong>Configurações</strong> &gt; aba **Pessoas**.
          </li>
          <li>Clique em **Adicionar Membro**.</li>
          <li>
            Se o membro for um dependente sem acesso ao sistema (ex: crianças ou controle
            pessoal), basta digitar o nome.
          </li>
          <li>
            Se for alguém que criará login próprio para lançar gastos, insira o **e-mail
            cadastrado ou que ele irá cadastrar**. Assim que ele logar no Pé de Meia com o mesmo
            e-mail, ele fará parte do seu grupo familiar automaticamente e verá os dados
            compartilhados.
          </li>
        </ol>
      </div>
    ),
  },
  {
    category: "shared",
    keywords: ["excluir membro", "remover participante", "deixar grupo"],
    question: "11. O que acontece se eu excluir um membro do Grupo Familiar?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Por integridade do banco de dados (DBA) e exatidão contábil, a exclusão de membros
          respeita regras estritas:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="p-3 bg-muted rounded-xl border border-border">
            <strong className="text-foreground block mb-0.5">
              ⚠️ Com pendências financeiras ativas:
            </strong>
            O sistema **bloqueará** a exclusão do membro se existirem despesas divididas com ele
            que ainda não foram totalmente acertadas/liquidadas. É obrigatório fazer o acerto de
            contas antes da remoção.
          </li>
          <li className="p-3 bg-muted rounded-xl border border-border">
            <strong className="text-foreground block mb-0.5">
              ✅ Sem pendências financeiras:
            </strong>
            O membro é desvinculado de forma segura, mas os lançamentos históricos em que ele
            participou no passado são preservados no banco para não alterar os saldos e o DRE dos
            meses anteriores.
          </li>
        </ul>
      </div>
    ),
  },

  // ==========================================
  // === CATEGORIA: CARTÕES E FATURAS ========
  // ==========================================
  {
    category: "cards",
    keywords: ["fatura", "fechamento", "vencimento", "melhor dia"],
    question: "12. Qual a regra exata usada para calcular o Fechamento e Vencimento de faturas?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          O Pé de Meia implementa perfeitamente o ciclo financeiro dos cartões de crédito reais:
        </p>
        <div className="space-y-2 text-sm">
          <p className="p-3 bg-muted rounded-xl border border-border">
            <strong className="text-foreground block mb-1">🗓️ Data de Fechamento (Corte):</strong>
            É o divisor de águas da fatura. Compras lançadas **no mesmo dia ou após** a data de
            fechamento entram automaticamente na fatura do **mês seguinte**.
            <br />
            <span className="text-sm text-primary italic">
              Exemplo: Se o fechamento é dia 10, uma compra feita em 10/05 vai vencer na fatura de
              Junho. Uma compra em 09/05 entra na fatura de Maio.
            </span>
          </p>
          <p className="p-3 bg-muted rounded-xl border border-border">
            <strong className="text-foreground block mb-1">🗓️ Data de Vencimento:</strong>É o
            prazo limite para pagamento físico da fatura fechada, ocorrendo normalmente alguns
            dias após o fechamento.
          </p>
        </div>
      </div>
    ),
  },
  {
    category: "cards",
    keywords: ["compras parceladas", "parcelado", "dividir compras", "cartão"],
    question: "13. Como o sistema calcula e projeta Compras Parceladas no cartão?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Ao adicionar uma despesa no cartão de crédito, marque a opção **Parcelado** e selecione
          a quantidade de parcelas (ex: `12x`).
        </p>
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-sm text-muted-foreground space-y-2">
          <span className="font-semibold text-foreground text-primary flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Provisão Futura Inteligente
          </span>
          <p>
            O sistema divide o valor total da compra pelas parcelas, cuida de eventuais
            arredondamentos de dízimas na última parcela, e provisiona os lançamentos futuros
            automaticamente nas faturas dos próximos meses respeitando a sua data de fechamento.
          </p>
        </div>
        <p className="text-sm">
          Suas faturas futuras já nascerão com esses comprometimentos de saldo lançados,
          proporcionando um cálculo exato de fluxo de caixa.
        </p>
      </div>
    ),
  },
  {
    category: "cards",
    keywords: ["excluir parcela", "apagar parcelamento", "estornar parcela"],
    question: "14. Como excluir uma compra parcelada? O que acontece com as parcelas futuras?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Se você fez uma compra parcelada por engano ou estornou a compra, vá até a tela de
          faturas do cartão, clique na transação desejada e selecione **Excluir**. O sistema
          exibirá duas opções:
        </p>
        <ul className="list-disc pl-4 space-y-2 text-sm">
          <li>
            <strong>Excluir apenas esta parcela:</strong> Remove somente a parcela do mês
            selecionado. As parcelas anteriores e futuras nos outros meses continuam intactas.
          </li>
          <li>
            <strong>Excluir todas as parcelas futuras:</strong> Cancela integralmente o
            parcelamento dali em diante, limpando de vez o peso das faturas dos meses
            subsequentes.
          </li>
        </ul>
      </div>
    ),
  },
  {
    category: "cards",
    keywords: ["limite de crédito", "alerta de limite", "limite estourado"],
    question: "15. Onde vejo e como funciona o alerta de aproximação do Limite do Cartão?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Ao cadastrar o cartão de crédito, você insere o **Limite Total** de compras permitido
          pela administradora.
        </p>
        <p className="text-sm">
          O Pé de Meia monitora a soma de todas as despesas acumuladas na fatura aberta e nas
          faturas futuras (compras parceladas ainda não quitadas). Se o saldo comprometido atingir
          **80% do limite total**, o sistema exibirá avisos visuais no seu painel de cartões e
          gerará notificações internas automáticas para evitar que o seu cartão seja recusado ou
          que você caia no cheque especial.
        </p>
      </div>
    ),
  },
  {
    category: "cards",
    keywords: [
      "importação fatura",
      "importar",
      "geladeira",
      "salvar parcelas",
      "faturas antigas",
    ],
    question:
      "16. Importação de Fatura (O caso da Geladeira): Como importar parcelas antigas de compras anteriores ao aplicativo?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Essa funcionalidade é perfeita para quem está começando a usar o aplicativo agora, mas
          já tem compras parceladas em andamento no cartão real.
        </p>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2 text-sm">
          <h5 className="font-semibold text-foreground text-primary flex items-center gap-1">
            ⚡ O Clássico Exemplo da Geladeira:
          </h5>
          <p>
            Imagine que você comprou uma geladeira parcelada em **10x de R$ 300,00**, mas só
            conheceu o Pé de Meia quando já havia pago **4 parcelas** na sua vida real.
          </p>
          <p className="font-medium text-foreground">
            Você só precisa lançar as 6 parcelas que restam pagar!
          </p>
          <p>
            Com a <strong>Importação de Faturas</strong>, você provisiona diretamente nas faturas
            dos próximos 6 meses o valor de R$ 300,00. Isso poupa você de cadastrar
            retroativamente as parcelas que já foram quitadas no passado, mantendo seus relatórios
            limpos e a projeção de gastos futuros perfeita.
          </p>
        </div>

        <p className="text-sm">
          Para usar, acesse o menu de ações do cartão e clique em **Importar Faturas**, digitando
          os valores a provisionar de forma rápida.
        </p>
      </div>
    ),
  },

  // ==========================================
  // === CATEGORIA: METAS E POUPANÇA ==========
  // ==========================================
  {
    category: "goals",
    keywords: ["metas", "reserva", "aportar", "poupar", "sonhos"],
    question: "17. Como criar uma Meta de Economia e fazer aportes e resgates?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          As **Metas** ajudam você a reservar dinheiro para objetivos específicos (Reserva de
          Emergência, Viagem, etc.) separando-o do seu saldo de gastos diários.
        </p>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Como usar:</p>
          <ol className="list-decimal pl-4 space-y-2">
            <li>Acesse o menu **Metas de Economia** no painel lateral.</li>
            <li>
              Clique em **Nova Meta**, insira um título, o valor total do objetivo e o prazo
              limite.
            </li>
            <li>
              <strong>Para Aportar (guardar dinheiro):</strong> Clique no botão **Aporte**,
              selecione a conta real de onde sairá o dinheiro e digite o valor. O sistema deduzirá
              o saldo da conta e somará na sua meta.
            </li>
            <li>
              <strong>Para Resgatar (retirar dinheiro):</strong> Caso precise usar o dinheiro
              guardado, clique em **Resgate** para transferir o saldo da meta de volta para a sua
              conta real de movimentação.
            </li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    category: "goals",
    keywords: ["medalhas", "badges", "troféus", "conquistas", "porcentagem"],
    question: "18. Como funciona a premiação de Badges e Medalhas de progresso das Metas?",
    answer: (
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Para incentivar sua disciplina financeira, o Pé de Meia possui um sistema de conquistas
          gamificado que concede medalhas automaticamente conforme você economiza:
        </p>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3 text-sm">
          <h5 className="font-semibold text-foreground text-primary flex items-center gap-1">
            🏆 Badges de Progresso de Meta:
          </h5>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-warning/10 text-warning rounded font-bold text-sm">
                🥉 BRONZE
              </span>
              <span>
                Desbloqueada ao atingir <strong>25%</strong> do valor total poupado.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-400/10 text-slate-400 rounded font-bold text-sm">
                🥈 PRATA
              </span>
              <span>
                Desbloqueada ao atingir <strong>50%</strong> de progresso.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded font-bold text-sm">
                🥇 OURO
              </span>
              <span>
                Desbloqueada ao atingir <strong>75%</strong> do objetivo.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-success/10 text-success rounded font-bold text-sm">
                🏆 DIAMANTE
              </span>
              <span>
                Troféu master concedido ao atingir <strong>100% (Meta Batida)!</strong>
              </span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },

  // ==========================================
  // === CATEGORIA: RELATÓRIOS E DRE ==========
  // ==========================================
  {
    category: "reports",
    keywords: ["dre", "competência", "caixa", "contabilidade", "relatórios"],
    question:
      "19. DRE Contábil: Qual a diferença matemática entre Regime de Caixa e de Competência?",
    answer: (
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Esta é a dúvida conceitual mais importante do sistema financeiro. O Pé de Meia monta seu
          **DRE** sob duas visões contábeis clássicas:
        </p>

        <div className="space-y-3 text-sm">
          <div className="p-3.5 bg-muted rounded-xl border border-border">
            <strong className="text-foreground flex items-center gap-2 mb-1">
              <CalendarIcon className="h-4 w-4 text-primary" /> Regime de Competência (Foco no
              Compromisso)
            </strong>
            <p className="leading-relaxed">
              Registra a receita ou despesa na **data em que a compra/venda ocorreu**, mesmo que
              você parcele em várias vezes.
              <br />
              <span className="text-sm text-primary block mt-1">
                💡 Exemplo: Uma TV de R$ 2.400,00 comprada em 12x de R$ 200,00 no cartão em
                Janeiro aparecerá como uma despesa cheia de **R$ 2.400,00 no DRE de Janeiro**
                (Competência).
              </span>
            </p>
          </div>

          <div className="p-3.5 bg-muted rounded-xl border border-border">
            <strong className="text-foreground flex items-center gap-2 mb-1">
              <WalletIcon className="h-4 w-4 text-primary" /> Regime de Caixa (Foco no Fluxo de
              Dinheiro)
            </strong>
            <p className="leading-relaxed">
              Registra as movimentações financeiras apenas na **data exata em que o dinheiro sai
              ou entra na sua conta**.
              <br />
              <span className="text-sm text-primary block mt-1">
                💡 Exemplo: A mesma TV de 12x aparecerá no DRE de Caixa como uma despesa de **R$
                200,00 em cada um dos 12 meses** seguintes à compra, conforme as faturas são
                liquidadas.
              </span>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    category: "reports",
    keywords: ["exportar", "pdf", "excel", "csv", "json"],
    question: "20. Como exportar meus relatórios e dados bancários do sistema?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>Você tem total controle sobre seus dados e pode extraí-los a qualquer momento:</p>
        <ul className="space-y-2 text-sm">
          <li className="p-2.5 bg-muted rounded-lg border border-border">
            <strong>Exportar PDF:</strong> Na tela de Transações, clique em **Exportar** &gt;
            **Exportar PDF** para gerar um relatório visual consolidado pronto para impressão.
          </li>
          <li className="p-2.5 bg-muted rounded-lg border border-border">
            <strong>Exportar Excel / CSV:</strong> Excelente para quem gosta de criar planilhas
            adicionais ou gráficos no Microsoft Excel ou Google Sheets.
          </li>
          <li className="p-2.5 bg-muted rounded-lg border border-border">
            <strong>Backup JSON:</strong> Baixe o dump de banco de dados com 100% de seus
            registros contábeis. Ideal para salvar backups offline periódicos.
          </li>
        </ul>
      </div>
    ),
  },

  // ==========================================
  // === CATEGORIA: INVESTIMENTOS =============
  // ==========================================
  {
    category: "investments",
    keywords: ["investimento", "proventos", "cdi", "ações", "fiis", "patrimônio"],
    question: "21. Como gerenciar carteiras de Investimentos e declarar proventos?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          O módulo de **Investimentos** serve para você acompanhar a rentabilidade do seu
          patrimônio de longo prazo em relação aos índices de mercado.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="p-2.5 bg-muted rounded-lg border border-border">
            <strong className="text-foreground block mb-0.5">
              📈 Rentabilidade da Carteira:
            </strong>
            Insira o ativo, o valor aplicado e o benchmark de rendimento (ex: `CDI` ou `IPCA`). O
            sistema plotará mensalmente a valorização estimada do seu patrimônio líquido.
          </li>
          <li className="p-2.5 bg-muted rounded-lg border border-border">
            <strong className="text-foreground block mb-0.5">
              💰 Lançar Proventos (Dividendos/Rendimentos de FIIs):
            </strong>
            Quando receber proventos, registre uma transação do tipo **Receita** na categoria
            **Investimentos** com a subcategoria **Dividendos/Proventos**. Isso retroalimentará os
            seus gráficos de rentabilidade histórica sem misturar com sua renda salarial padrão.
          </li>
        </ul>
      </div>
    ),
  },

  // ==========================================
  // === CATEGORIA: VIAGENS E PROJETOS ========
  // ==========================================
  {
    category: "trips",
    keywords: ["viagem", "euro", "peso", "moeda local", "turismo", "compras"],
    question:
      "22. Viagens e Projetos Especiais: Como funciona o rateio e controle multi-moedas de turismo?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          O módulo de **Viagens** isola os custos de eventos sazonais do seu orçamento de
          sobrevivência mensal.
        </p>
        <div className="space-y-2 text-sm">
          <p className="p-3 bg-muted rounded-xl border border-border">
            <strong className="text-foreground block mb-1">
              💱 Lançamento em Qualquer Moeda Local:
            </strong>
            Se estiver na Europa ou na Argentina, você pode lançar gastos em Euros (€) ou Pesos
            ($). O Pé de Meia faz a conversão cambial histórica para Reais na data exata da
            compra, ajudando a saber em tempo real quanto a viagem já custou em Reais.
          </p>
          <p className="p-3 bg-muted rounded-xl border border-border">
            <strong className="text-foreground block mb-1">
              🛒 Shopping List (Lista de Compras da Viagem):
            </strong>
            Dentro da viagem, você pode criar uma lista de itens a comprar de forma colaborativa
            com os outros participantes da viagem, facilitando o tracking de souvenirs e compras
            de supermercado das férias.
          </p>
        </div>
      </div>
    ),
  },

  // ==========================================
  // === CATEGORIA: SEGURANÇA E DADOS =========
  // ==========================================
  {
    category: "security",
    keywords: ["segurança", "supabase", "rls", "lgpd", "excluir dados", "admin"],
    question: "23. Onde meus dados são salvos? O que é o RLS (Row Level Security)?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Levamos sua privacidade e segurança financeira como um compromisso matemático absoluto.
        </p>
        <div className="space-y-2.5 text-sm">
          <div className="p-3 bg-muted rounded-xl border border-border flex gap-2">
            <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground block mb-0.5">
                Hospedagem Postgres Corporativa:
              </strong>
              Seus dados financeiros são salvos em instâncias segregadas do **Supabase
              PostgreSQL**, com criptografia de ponta a ponta e redundância física.
            </div>
          </div>
          <div className="p-3 bg-muted rounded-xl border border-border flex gap-2">
            <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground block mb-0.5">
                Segurança em Nível de Linha (RLS):
              </strong>
              Implementamos regras severas de **Row Level Security (RLS)** a nível de banco de
              dados. Isso significa que, por diretriz de segurança lógica do Postgres, **nenhuma
              query, hacker ou outro usuário tem a capacidade física** de ler ou gravar qualquer
              linha da tabela que não pertença estritamente ao seu ID criptográfico de
              autenticação de usuário logado.
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    category: "security",
    keywords: ["excluir conta", "lgpd", "apagar histórico", "limpar tudo"],
    question: "24. Como deletar definitivamente minha conta e todos os meus dados financeiros?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Em total conformidade com a **LGPD (Lei Geral de Proteção de Dados)**, respeitamos a sua
          soberania sobre os seus dados.
        </p>
        <div className="p-3.5 bg-destructive/5 rounded-xl border border-destructive/10 text-sm space-y-2.5">
          <strong className="text-destructive flex items-center gap-2 font-semibold">
            <Trash2 className="h-4 w-4 text-destructive" /> Processo de Exclusão Irreversível:
          </strong>
          <p>
            Caso queira encerrar o uso do Pé de Meia, vá em **Configurações** &gt; aba **Backup e
            Dados** e selecione a opção **Excluir Conta Permanentemente**.
          </p>
          <p>
            Esta ação apagará de forma definitiva, física e irreversível todos os seus registros
            de transações, contas bancárias, splits compartilhados, cartões de crédito e
            credenciais de login de todos os nossos servidores. Não mantemos backups de contas
            excluídas!
          </p>
        </div>
      </div>
    ),
  },
  {
    category: "security",
    keywords: ["admin reset", "simulação", "zerar", "painel admin", "resetar banco"],
    question: "25. Painel Admin: O que é a limpeza de simulação e como utilizá-la?",
    answer: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          O **Admin Reset Panel** (Painel de Administração de Reset) é uma ferramenta corporativa
          exclusiva voltada para desenvolvedores e testadores limparem dados de simulação ou
          demonstração.
        </p>
        <p className="text-sm">
          Se você utilizou o Pé de Meia para fazer testes rápidos com transações fictícias, moedas
          de mentira ou splits fictícios de grupo familiar e agora deseja começar a lançar sua
          vida financeira real do zero, acesse **Configurações** &gt; **Painel Admin** e utilize o
          botão de reset. Ele limpará todos os registros simulados mantendo as suas credenciais de
          login intactas, para que você possa iniciar sua jornada financeira real com o banco de
          dados limpo e impecável.
        </p>
      </div>
    ),
  },
];
