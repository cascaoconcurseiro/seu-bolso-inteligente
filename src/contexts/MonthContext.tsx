import React, { createContext, useContext, useState, ReactNode } from "react";
import { startOfMonth, addMonths, subMonths } from "date-fns";

interface MonthContextType {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));

  const goToPrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const goToCurrentMonth = () => setCurrentDate(startOfMonth(new Date()));

  return (
    <MonthContext.Provider
      value={{
        currentDate,
        setCurrentDate,
        goToPrevMonth,
        goToNextMonth,
        goToCurrentMonth,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error("useMonth must be used within a MonthProvider");
  }
  return context;
}
