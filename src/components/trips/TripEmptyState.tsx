import { Button } from "@/components/ui/button";
import { Plane, Plus } from "lucide-react";

interface TripEmptyStateProps {
  onCreateClick: () => void;
}

export function TripEmptyState({ onCreateClick }: TripEmptyStateProps) {
  return (
    <div className="py-16 text-center border border-dashed border-border rounded-xl">
      <Plane className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-display font-semibold text-lg mb-2">Nenhuma viagem cadastrada</h3>
      <p className="text-muted-foreground mb-6">Crie sua primeira viagem para organizar gastos</p>
      <Button onClick={onCreateClick} className="h-11 md:h-10">
        <Plus className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">Nova viagem</span>
        <span className="md:hidden">Nova</span>
      </Button>
    </div>
  );
}
