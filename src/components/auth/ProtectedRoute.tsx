import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet } from "lucide-react";
import { AppLock } from "./AppLock";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <div className="w-[72px] h-[72px] bg-primary rounded-[20px] flex items-center justify-center animate-pulse shadow-[0_10px_25px_-5px_rgba(16,185,129,0.3)]">
          <Wallet className="w-9 h-9 text-white" />
        </div>
        <div className="mt-5 font-display font-bold text-[26px] tracking-[-0.05em] text-foreground">
          pé de meia
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLock>
      {children}
    </AppLock>
  );
}
