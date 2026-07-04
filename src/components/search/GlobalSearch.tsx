import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useGoals } from "@/hooks/useGoals";
import { supabase } from "@/integrations/supabase/client";
import { moneyUtils } from "@/utils/money";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, Target, ArrowRightLeft } from "lucide-react";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [serverResults, setServerResults] = useState<any[]>([]);

  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { goals = [] } = useGoals();

  const q = query.trim().toLowerCase();

  // Cache-first: search in-memory immediately; fall back to server after 400ms debounce
  const cachedTransactions = useMemo(() => {
    if (q.length < 2) return [];
    return transactions.filter((t) => t.description.toLowerCase().includes(q)).slice(0, 8);
  }, [transactions, q]);

  useEffect(() => {
    if (q.length < 2) {
      setServerResults([]);
      return;
    }

    // Only hit the server if cache returns nothing (user has > cached transactions)
    if (cachedTransactions.length >= 8) {
      setServerResults([]);
      return;
    }

    const id = setTimeout(async () => {
      const { data } = await supabase.rpc("search_transactions", {
        p_query: q,
        p_limit: 20,
      });
      if (data) {
        // Merge server results with cache, dedup by id
        const cachedIds = new Set(cachedTransactions.map((t) => t.id));
        const extra = (data as any[]).filter((r) => !cachedIds.has(r.id));
        setServerResults(extra.slice(0, 8 - cachedTransactions.length));
      }
    }, 400);

    return () => clearTimeout(id);
  }, [q, cachedTransactions]);

  const filteredTransactions = useMemo(() => {
    return [...cachedTransactions, ...serverResults].slice(0, 8);
  }, [cachedTransactions, serverResults]);

  const filteredAccounts = useMemo(() => {
    if (q.length < 2) return [];
    return accounts.filter((a: any) => a.name.toLowerCase().includes(q)).slice(0, 5);
  }, [accounts, q]);

  const filteredGoals = useMemo(() => {
    if (q.length < 2) return [];
    return goals?.filter((g: any) => g.name.toLowerCase().includes(q)).slice(0, 5) ?? [];
  }, [goals, q]);

  const hasResults =
    filteredTransactions.length > 0 || filteredAccounts.length > 0 || filteredGoals.length > 0;

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setServerResults([]);
  }, [onOpenChange]);

  const goTo = useCallback(
    (path: string) => {
      close();
      navigate(path);
    },
    [close, navigate]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogTitle className="sr-only">Busca global</DialogTitle>
      <CommandInput
        placeholder="Buscar transações, contas, metas..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[70vh]">
        {q.length >= 2 && !hasResults && (
          <CommandEmpty>Nenhum resultado para "{query}"</CommandEmpty>
        )}
        {q.length < 2 && (
          <CommandGroup heading="Atalhos">
            <CommandItem onSelect={() => goTo("/transacoes")}>
              <ArrowRightLeft className="mr-2 h-4 w-4 text-muted-foreground" />
              Ir para Transações
            </CommandItem>
            <CommandItem onSelect={() => goTo("/contas")}>
              <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
              Ir para Contas
            </CommandItem>
            <CommandItem onSelect={() => goTo("/metas")}>
              <Target className="mr-2 h-4 w-4 text-muted-foreground" />
              Ir para Metas
            </CommandItem>
          </CommandGroup>
        )}

        {filteredTransactions.length > 0 && (
          <CommandGroup heading="Transações">
            {filteredTransactions.map((t: any) => (
              <CommandItem
                key={t.id}
                value={`tx-${t.id}-${t.description}`}
                onSelect={() => goTo("/transacoes")}
                className="flex items-center gap-3"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-base shrink-0">
                  {t.category?.icon || (t.type === "INCOME" ? "💰" : "💸")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(t.date), "d MMM yyyy", { locale: ptBR })}
                    {t.category?.name ? ` · ${t.category.name}` : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-mono font-medium shrink-0 ${t.type === "INCOME" ? "text-positive" : "text-negative"}`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {moneyUtils.format(t.amount, t.currency || "BRL")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredAccounts.length > 0 && (
          <CommandGroup heading="Contas">
            {filteredAccounts.map((a: any) => (
              <CommandItem
                key={a.id}
                value={`acc-${a.id}-${a.name}`}
                onSelect={() => goTo("/contas")}
                className="flex items-center gap-3"
              >
                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.type}</p>
                </div>
                <span className="text-sm font-mono font-medium shrink-0 text-positive">
                  {moneyUtils.format(a.balance ?? 0, a.currency || "BRL")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredGoals.length > 0 && (
          <CommandGroup heading="Metas">
            {filteredGoals.map((g: any) => (
              <CommandItem
                key={g.id}
                value={`goal-${g.id}-${g.name}`}
                onSelect={() => goTo("/metas")}
                className="flex items-center gap-3"
              >
                <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {moneyUtils.format(g.current_amount ?? 0, "BRL")} /{" "}
                    {moneyUtils.format(g.target_amount ?? 0, "BRL")}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
