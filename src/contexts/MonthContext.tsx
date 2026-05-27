import React, { createContext, useContext, useState, ReactNode } from "react";
import * as dateFns from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";

interface MonthContextType {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  startDay: number;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => dateFns.startOfMonth(new Date()));
  const { data: profile } = useUserProfile();
  
  const startDay = profile?.month_start_day || 1;

  const goToPrevMonth = () => setCurrentDate((prev) => dateFns.subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate((prev) => dateFns.addMonths(prev, 1));
  const goToCurrentMonth = () => setCurrentDate(dateFns.startOfMonth(new Date()));

  return (
    <MonthContext.Provider
      value={{
        currentDate,
        setCurrentDate,
        goToPrevMonth,
        goToNextMonth,
        goToCurrentMonth,
        startDay,
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
