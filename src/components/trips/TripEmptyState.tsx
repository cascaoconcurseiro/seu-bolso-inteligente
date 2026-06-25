import { Button } from "@/components/ui/button";
import { Plane, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface TripEmptyStateProps {
  onCreateClick: () => void;
}

export function TripEmptyState({ onCreateClick }: TripEmptyStateProps) {
  return (
    <EmptyState
      icon={Plane}
      title="Nenhuma viagem cadastrada"
      description="Crie sua primeira viagem para organizar gastos em grupo, dividi-los entre participantes e acompanhar o orçamento."
      action={
        <Button onClick={onCreateClick} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all font-semibold">
          <Plus className="h-5 w-5 mr-2" />
          Nova Viagem
        </Button>
      }
    />
  );
}
