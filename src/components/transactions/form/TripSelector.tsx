import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

interface TripSelectorProps {
  tripId: string;
  setTripId: (v: string) => void;
  trips: any[];
}

export function TripSelector({ tripId, setTripId, trips }: TripSelectorProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <Label>Viagem (opcional)</Label>
      {trips && trips.length > 0 ? (
        <Select
          value={tripId || 'none'}
          onValueChange={(v) => setTripId(v === 'none' ? '' : v)}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Vincular a uma viagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {trips.map((trip) => (
              <SelectItem key={trip.id} value={trip.id}>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  {trip.name}
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {trip.currency}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="h-12 flex items-center justify-between px-4 border border-dashed border-border rounded-lg">
          <span className="text-sm text-muted-foreground">Nenhuma viagem cadastrada</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/viagens')}
            className="text-xs"
          >
            Criar viagem
          </Button>
        </div>
      )}
    </div>
  );
}
