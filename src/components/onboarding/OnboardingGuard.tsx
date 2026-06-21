import { useState, useEffect } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { WelcomeOnboarding } from "./WelcomeOnboarding";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { data: accounts, isLoading, isFetching, isSuccess } = useAccounts();
  const { data: profile } = useUserProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // If finished loading and fetching, and there are absolutely no accounts, trigger onboarding
    if (isSuccess && !isLoading && !isFetching && accounts !== undefined && accounts.length === 0) {
      if (profile?.id) {
        // Check if user permanently dismissed it
        const hasCompleted = localStorage.getItem(`ONBOARDING_COMPLETED_${profile.id}`) || sessionStorage.getItem("ONBOARDING_COMPLETED");
        if (!hasCompleted) {
          setShowOnboarding(true);
        }
      } else if (!profile) {
        // Fallback for cases without profile yet but no session skip
        if (!sessionStorage.getItem("ONBOARDING_COMPLETED")) {
           setShowOnboarding(true);
        }
      }
    }
  }, [accounts, isLoading, isFetching, isSuccess, profile]);

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
            if (profile?.id) {
              localStorage.setItem(`ONBOARDING_COMPLETED_${profile.id}`, "true");
            }
            sessionStorage.setItem("ONBOARDING_COMPLETED", "true");
            setShowOnboarding(false);
          }} 
        />
      )}
    </>
  );
}
