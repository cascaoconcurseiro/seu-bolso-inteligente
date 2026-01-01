import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMonth } from "@/contexts/MonthContext";

export function MonthSelector() {
  const { currentDate, goToPrevMonth, goToNextMonth } = useMonth();
  const [displayDate, setDisplayDate] = useState(currentDate);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const getMonthInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  };

  const handleMonthChange = useCallback(
    (direction: "prev" | "next") => {
      if (isTransitioning) return;

      setIsTransitioning(true);

      // Atualiza a data de exibição imediatamente
      const newDate = new Date(currentDate);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      setDisplayDate(newDate);

      // Chama a função de mudança
      if (direction === "next") {
        goToNextMonth();
      } else {
        goToPrevMonth();
      }

      setTimeout(() => setIsTransitioning(false), 150);
    },
    [currentDate, goToNextMonth, goToPrevMonth, isTransitioning]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isTransitioning) return;

      // Atualiza display imediatamente
      if (e.target.value) {
        const [year, month] = e.target.value.split("-");
        const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        setDisplayDate(newDate);
      }

      // Debounce para evitar múltiplas chamadas
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        if (e.target.value) {
          const [year, month] = e.target.value.split("-");
          const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          // Aqui você pode adicionar uma função setMonth no contexto se necessário
        }
      }, 50);
    },
    [isTransitioning]
  );

  // Sincroniza displayDate com currentDate
  useEffect(() => {
    if (!isTransitioning) {
      setDisplayDate(currentDate);
    }
  }, [currentDate, isTransitioning]);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`flex items-center space-x-1 bg-muted rounded-full p-1 border flex-1 justify-center max-w-[180px] sm:max-w-[200px] md:max-w-[220px] transition-all duration-150 ${
        isTransitioning ? "opacity-90" : "opacity-100"
      }`}
    >
      <button
        onClick={() => handleMonthChange("prev")}
        disabled={isTransitioning}
        className="relative z-30 p-2 md:p-1.5 hover:bg-background hover:shadow-sm rounded-full transition-all text-muted-foreground active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
      >
        <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
      </button>

      <div className="flex items-center justify-center relative group cursor-pointer h-10 md:h-8 px-2 min-w-[70px]">
        <span
          className={`text-xs sm:text-sm font-bold text-foreground pointer-events-none leading-none pt-0.5 truncate transition-opacity duration-150 ${
            isTransitioning ? "opacity-70" : "opacity-100"
          }`}
        >
          {displayDate
            .toLocaleString("pt-BR", { month: "short" })
            .replace(".", "")
            .toUpperCase()}
          /{displayDate.getFullYear().toString().slice(2)}
        </span>
        <input
          type="month"
          value={getMonthInputValue(displayDate)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
          onChange={handleInputChange}
          disabled={isTransitioning}
        />
      </div>

      <button
        onClick={() => handleMonthChange("next")}
        disabled={isTransitioning}
        className="relative z-30 p-2 md:p-1.5 hover:bg-background hover:shadow-sm rounded-full transition-all text-muted-foreground active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
      >
        <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
      </button>
    </div>
  );
}
