import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/admin/dashboard";
import ClientsListPage from "@/pages/admin/clients";
import NewClientPage from "@/pages/admin/new-client";
import ClientDetailPage from "@/pages/admin/client-detail";
import ClientDashboard from "@/pages/client/dashboard";
import ClientFamilyTreePage from "@/pages/client/family-tree";
import AdminDocumentsPage from "@/pages/admin/documents";
import ClientDocumentsPage from "@/pages/client/documents";
import NotFound from "@/pages/not-found";
import { GlobalBackground } from "@/components/GlobalBackground";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Route transition effect for 3D background
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('app-route-change'));
  }, [location]);

  if (isLoading) return null;

  return (
    <div className="relative min-h-screen">
      <div id="page-overlay" />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <Switch key={location} location={location}>
            <Route path="/">
              {user ? (
                user.role === "admin" ? <Redirect to="/admin/dashboard" /> : <Redirect to="/client/dashboard" />
              ) : (
                <LandingPage />
              )}
            </Route>

            <Route path="/login">
              {user ? (
                user.role === "admin" ? <Redirect to="/admin/dashboard" /> : <Redirect to="/client/dashboard" />
              ) : (
                <LoginPage />
              )}
            </Route>

            {/* Authenticated Routes */}
            <Route path="/admin/dashboard">
              {user?.role === "admin" ? <AdminDashboard /> : <Redirect to="/login" />}
            </Route>
            <Route path="/admin/clients/new">
              {user?.role === "admin" ? <NewClientPage /> : <Redirect to="/login" />}
            </Route>
            <Route path="/admin/clients/:clientId">
              {() => user?.role === "admin" ? <ClientDetailPage /> : <Redirect to="/login" />}
            </Route>
            <Route path="/admin/clients">
              {user?.role === "admin" ? <ClientsListPage /> : <Redirect to="/login" />}
            </Route>
            <Route path="/admin/documents">
              {user?.role === "admin" ? <AdminDocumentsPage /> : <Redirect to="/login" />}
            </Route>

            <Route path="/client/dashboard">
              {user?.role === "client" ? <ClientDashboard /> : <Redirect to="/login" />}
            </Route>
            <Route path="/client/family-tree">
              {user?.role === "client" ? <ClientFamilyTreePage /> : <Redirect to="/login" />}
            </Route>
            <Route path="/client/documents">
              {user?.role === "client" ? <ClientDocumentsPage /> : <Redirect to="/login" />}
            </Route>

            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
