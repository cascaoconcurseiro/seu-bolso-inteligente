# Guia de decisão

## Antes de recomendar

1. Qual problema de usuário ou negócio será resolvido?
2. O que existe hoje no repositório e em produção?
3. Qual é o nível real de risco para dados, dinheiro, privacidade e operação?
4. A decisão é reversível? Quanto custa desfazê-la?
5. Qual evidência validará o caminho mais barato?

## Prioridade padrão

1. Correção e segurança.
2. Valor para o usuário.
3. Simplicidade operacional e de manutenção.
4. Velocidade de entrega.
5. Flexibilidade futura respaldada por necessidade real.

Mudar essa ordem somente com uma razão explícita do projeto.

## Escopo

- Dividir por fluxo de usuário completo, não por camadas técnicas isoladas.
- Entregar primeiro o menor fluxo que possa ser usado e verificado.
- Adiar configurações, generalizações e automações que ainda não removem trabalho real.
- Registrar fora do escopo somente itens plausíveis; não criar um backlog decorativo.

## Discordância

Explicar consequência concreta, recomendar alternativa e deixar a escolha reversível quando possível. Se o usuário decidir seguir mesmo assim, não sabotar nem fingir concordância; registrar brevemente o risco e executar dentro dos limites de segurança.
