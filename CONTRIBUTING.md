# Como Contribuir para o Pé de Meia

Primeiramente, obrigado pelo interesse em contribuir com o **Pé de Meia**! 🎉  
Nós incentivamos a comunidade a nos ajudar a criar o melhor sistema de gerenciamento financeiro de código aberto.

## 📌 Processo de Desenvolvimento

1. **Faça um Fork** do projeto e crie sua branch de desenvolvimento a partir da `main`.
2. O nome da branch deve descrever sua intenção, ex: `feature/nova-categoria`, `bugfix/erro-divisao`.
3. Garanta que o seu código passe no Linter e nos Testes locais antes de fazer commit.
   ```bash
   npm run lint
   npm run test
   ```

## 🐛 Reportando Bugs

Ao abrir uma issue para reportar um bug, certifique-se de utilizar nosso **Bug Report Template** (presente na aba "Issues" -> "New Issue").
- Inclua **passos para reproduzir** o erro detalhadamente.
- Mencione o comportamento esperado e o comportamento atual.
- Inclua seu dispositivo/OS (Mobile, Desktop, iOS, Android, etc.).

## 💡 Sugerindo Melhorias (Features)

Sinta-se à vontade para sugerir melhorias! Utilize o template **Feature Request**.
- Descreva claramente qual problema a sua feature resolve.
- Descreva alternativas que você considerou.
- Anexe prints ou mockups se envolver interface (UI/UX).

## 🚀 Padrão de Commits

Nós seguimos o padrão de **Conventional Commits**:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Apenas mudanças na documentação
- `style:` Mudanças de formatação/estilo que não afetam a lógica (espaços, ponto e vírgula, etc)
- `refactor:` Refatoração de código que não adiciona feature nem corrige bug
- `test:` Adição ou correção de testes

Exemplo: `feat: adiciona skeleton loaders na lista de transações`

## ✨ Pull Requests

- Toda Pull Request (PR) deve passar pelas validações automáticas do GitHub Actions.
- Preencha corretamente o template de PR, descrevendo as mudanças feitas e listando testes locais que você executou.
- Vincule a PR à Issue original (ex: "Closes #42").

Aguarde a revisão de um dos nossos mantenedores. Feliz codificação! 🚀
