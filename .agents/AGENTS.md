# AGENTS.md — Regras do Projeto: Seu Bolso Inteligente

---

## ⚛️ LEI DO EFEITO SEGURO (Anti React Error #185 / Loop Infinito)

**Gatilho:** Qualquer `useEffect` que contenha uma chamada a um setter de estado (`setState`, `setSplits`, `setXxx`) ou uma função que mute estado externo (ex: Zustand `set`).

### A Regra

> É **EXPRESSAMENTE PROIBIDO** incluir no array de dependências de um `useEffect` o mesmo valor de estado que é **escrito** (via setter) dentro desse mesmo effect.

Isso cria um ciclo garantido:  
`state muda → effect dispara → setState → state muda → effect dispara → ...`  
(**React Error #185: Maximum update depth exceeded**)

---

### Protocolo Obrigatório ao Escrever `useEffect` com Setters

Antes de fechar o array `[]` de qualquer effect, responda mentalmente:

1. **"Eu escrevo em X dentro deste effect?"** → Se sim, `X` não entra nas deps.
2. **"Preciso ler o valor atual de X para decidir se chamo o setter?"** → Usar `useRef` como espelho (veja padrão abaixo), não colocar o estado nas deps.
3. **"A comparação de igualdade usa `float`?"** → Comparar em **centavos inteiros** (`Math.round(val * 100)`), nunca com `===` direto em decimais monetários.

---

### Padrão Canônico: `useRef` como Escudo Anti-Loop

Quando precisar comparar "o que foi enviado por último" sem criar dependência circular, use um `ref` como memória privada do effect:

```tsx
// ✅ CORRETO — useRef como escudo
const lastSentRef = useRef<{ value: number } | null>(null);

useEffect(() => {
  if (!isOpen) return;

  // Comparação em inteiros para evitar imprecisão de float
  const newValueCents = Math.round(newValue * 100);
  const lastCents = lastSentRef.current ? Math.round(lastSentRef.current.value * 100) : -1;

  if (newValueCents === lastCents) return; // guard clause — sai sem causar re-render

  const payload = { value: newValue };
  lastSentRef.current = payload; // atualiza ref ANTES do setter
  setState(payload);             // só chama setState se realmente mudou
}, [isOpen, newValue, setState]); // `state` (lido acima) NÃO está aqui
```

```tsx
// ❌ PROIBIDO — loop infinito garantido
useEffect(() => {
  if (state.value !== newValue) {
    setState({ value: newValue }); // escreve em `state`
  }
}, [state, newValue]); // lê `state` nas deps → LOOP
```

---

### Checklist Pré-Commit para Effects com Setters

- [ ] Nenhum estado **escrito** dentro do effect está no array de deps
- [ ] Comparações de igualdade monetária usam centavos inteiros (`Math.round`)
- [ ] Se precisar ler o "último valor enviado", usar `useRef`, não o próprio estado
- [ ] O effect tem **guard clause** no topo (`if (!condition) return;`) para não executar desnecessariamente
- [ ] Rodar `npm run build` confirma 0 erros antes do push

---

### Origem desta Regra

Gerada após correção do **React Error #185** no componente `SplitModal.tsx`  
(commit `489d323`, 2026-06-20). O effect de sincronização de splits tinha `splits`  
nas deps enquanto chamava `setSplits` internamente. A proteção `isSame` falhava  
silenciosamente por imprecisão de float (`0.30000000000000004 !== 0.3`),  
garantindo que o loop nunca parasse.
