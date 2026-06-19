import { useSharedCreditCards, useRespondSharedCardInvite } from "@/hooks/useSharedCreditCards";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Check, X } from "lucide-react";
import { BankIcon } from "@/components/financial/BankIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export function PendingSharedCardInvitationsAlert() {
  const { user } = useAuth();
  const { data: sharedCards = [], isLoading } = useSharedCreditCards();
  const respondInvite = useRespondSharedCardInvite();


  if (isLoading) return null;

  const pendingInvites = sharedCards.filter(
    (card) => card.status === "PENDING" && card.user_id === user?.id
  );

  if (pendingInvites.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {pendingInvites.map((invite) => {


        const handleAccept = () => {
          respondInvite.mutate({ 
            inviteId: invite.id, 
            status: 'ACCEPTED'
          });
        };

        return (
          <Alert key={invite.id} className="border-emerald-500/50 bg-emerald-500/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-3 items-center">
              <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Convite de Cartão Compartilhado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você foi convidado(a) para participar do cartão de crédito <b>{invite.accounts?.name || 'Compartilhado'}</b>. Ao aceitar, vocês poderão dividir faturas.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">

              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-red-500/30 text-red-600 hover:bg-red-50"
                onClick={() => respondInvite.mutate({ inviteId: invite.id, status: 'REJECTED' })}
                disabled={respondInvite.isPending}
              >
                <X className="w-4 h-4 mr-1.5" />
                Recusar
              </Button>
              <Button
                size="sm"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleAccept}
                disabled={respondInvite.isPending}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Aceitar
              </Button>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}
