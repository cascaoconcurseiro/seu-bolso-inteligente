import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <div className="w-24 h-24 flex items-center justify-center animate-pulse">
          <img src="/icon-512.png" alt="Pé de Meia" className="w-full h-full object-contain drop-shadow-sm" />
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

  return <>{children}</>;
}
