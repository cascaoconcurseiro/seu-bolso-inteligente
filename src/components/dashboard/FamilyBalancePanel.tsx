import { memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useMonth } from "@/contexts/MonthContext";
import { moneyUtils } from "@/utils/money";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { cn } from "@/lib/utils";
import { Users, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { rpcWithRetry } from "@/utils/rpcWithRetry";
import * as dateFns from "date-fns";

export const FamilyBalancePanel = memo(function FamilyBalancePanel() {
  const { user } = useAuth();
  const { isPrivate } = usePrivacy();
  const { currentDate } = useMonth();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers(true);

  // Calcula range do mês corrente para filtrar apenas dívidas do mês
  const monthRange = useMemo(() => {
    const start = dateFns.startOfMonth(currentDate);
    const end = dateFns.endOfMonth(currentDate);
    return {
      start: dateFns.format(start, "yyyy-MM-dd"),
      end: dateFns.format(end, "yyyy-MM-dd"),
    };
  }, [currentDate]);

  const { data: sharedBalances, isLoading: balancesLoading } = useQuery({
    queryKey: ["shared-balances", user?.id, monthRange.start, monthRange.end],
    queryFn: async () => {
      if (!user) return [];
      try {
        const data = await rpcWithRetry("get_current_shared_debts", {
          p_user_id: user.id,
          p_start_date: monthRange.start,
          p_end_date: monthRange.end,
        });
        return data as Array<{
          member_id: string;
          currency: string;
          total_credits: number;
          total_debits: number;
          net_balance: number;
        }>;
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
  });

  // Só mostrar se há membros de família com linked_user_id (membros reais)
  const linkedMembers = members.filter((m) => m.linked_user_id && m.linked_user_id !== user?.id);
  if (membersLoading || balancesLoading) return null;
  if (linkedMembers.length === 0) return null;
  if (!sharedBalances || sharedBalances.length === 0) return null;

  // Agrupa saldos por membro
  const balanceByMember = new Map<string, { credits: number; debits: number; net: number }>();
  sharedBalances.forEach((b) => {
    const existing = balanceByMember.get(b.member_id);
    if (existing) {
      existing.credits += Number(b.total_credits);
      existing.debits += Number(b.total_debits);
      existing.net += Number(b.net_balance);
    } else {
      balanceByMember.set(b.member_id, {
        credits: Number(b.total_credits),
        debits: Number(b.total_debits),
        net: Number(b.net_balance),
      });
    }
  });

  const membersWithBalance = linkedMembers
    .map((m) => ({ member: m, balance: balanceByMember.get(m.id) }))
    .filter((x) => x.balance && (x.balance.credits > 0 || x.balance.debits > 0));

  if (membersWithBalance.length === 0) return null;

  // Link "Ver tudo" aponta para o mês selecionado no seletor
  const selectedMonth = dateFns.format(currentDate, "yyyy-MM");
  const linkTo = `/compartilhados?month=${selectedMonth}`;

  return (
    <div className="p-4 rounded-2xl border border-border bg-card space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Saldo com a Família
          </h3>
        </div>
        <Link to={linkTo} className="text-xs text-primary flex items-center gap-1 hover:underline">
          Ver tudo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {membersWithBalance.map(({ member, balance }) => {
          if (!balance) return null;
          const isPositive = balance.net >= 0;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">{member.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPositive ? "Te deve" : "Você deve"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-sm font-bold",
                    isPrivate && "blur-md opacity-50 select-none",
                    isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {isPrivate ? "•••••" : moneyUtils.format(Math.abs(balance.net), "BRL")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
