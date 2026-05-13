import React, { createContext, useContext, useEffect, useRef } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const redirectedRef = useRef(false);

  const { data: user, isLoading, error, isFetching } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 30 * 1000,
      gcTime: 60 * 1000,
    } as any,
  });

  useEffect(() => {
    if (!isLoading && error) {
      const status = error?.status ?? error?.response?.status;
      const is401 = status === 401;
      
      // Only redirect to login if we are NOT on the landing page (/)
      // and we are NOT already on the login page
      const isLandingPage = location === "/";
      if (is401 && !isLandingPage && location !== "/login" && !redirectedRef.current) {
        redirectedRef.current = true;
        setLocation("/login");
      }
    }
    if (user) {
      redirectedRef.current = false;
    }
  }, [isLoading, error, user, location, setLocation]);

  // If we are on a protected route but don't have a user yet, and we are still loading or fetching, show loader
  // Allow the landing page (/) to load without a full-screen spinner
  const isLandingPage = location === "/";
  if ((isLoading || isFetching) && !user && location !== "/login" && !isLandingPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
