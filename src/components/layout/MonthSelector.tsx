import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonth } from "@/contexts/MonthContext";
import { format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function MonthSelector() {
  const { currentDate, goToPrevMonth, goToNextMonth, goToCurrentMonth } = useMonth();
  const isCurrentMonth = isSameMonth(currentDate, new Date());

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevMonth}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        onClick={goToCurrentMonth}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
          isCurrentMonth
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted"
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium capitalize min-w-[100px] text-center">
          {format(currentDate, "MMM yyyy", { locale: ptBR })}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextMonth}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
