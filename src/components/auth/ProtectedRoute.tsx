import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hideNativeSplash } from "@/utils/splash";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) hideNativeSplash();
  }, [loading]);

  // Enquanto a sessão resolve, o splash do index.html (fora do #root) ainda
  // cobre a tela — não renderizar um segundo splash com o mesmo logo.
  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
