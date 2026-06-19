import { useState, useEffect } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { WelcomeOnboarding } from "./WelcomeOnboarding";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { data: accounts, isLoading, isFetching, isSuccess } = useAccounts();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // If finished loading and fetching, and there are absolutely no accounts, trigger onboarding
    if (isSuccess && !isLoading && !isFetching && accounts !== undefined && accounts.length === 0) {
      // Check if user just dismissed it in this session to prevent infinite loop
      // if we redirect them
      if (!sessionStorage.getItem("ONBOARDING_COMPLETED")) {
        setShowOnboarding(true);
      }
    }
  }, [accounts, isLoading, isFetching, isSuccess]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <>
      {children}
      {showOnboarding && (
        <WelcomeOnboarding 
          onComplete={() => {
            sessionStorage.setItem("ONBOARDING_COMPLETED", "true");
            setShowOnboarding(false);
          }} 
        />
      )}
    </>
  );
}
