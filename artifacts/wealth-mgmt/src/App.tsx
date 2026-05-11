import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/login";
import LandingPage from "@/pages/landing";
import DemoPage from "@/pages/demo";
import AdminDashboard from "@/pages/admin/dashboard";
import ClientsListPage from "@/pages/admin/clients";
import NewClientPage from "@/pages/admin/new-client";
import ClientDetailPage from "@/pages/admin/client-detail";
import ClientDashboard from "@/pages/client/dashboard";
import ClientFamilyTreePage from "@/pages/client/family-tree";
import AdminDocumentsPage from "@/pages/admin/documents";
import ClientDocumentsPage from "@/pages/client/documents";
import NotFound from "@/pages/not-found";

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

  if (isLoading) return null;

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/demo" component={DemoPage} />

      <Route path="/admin/dashboard">
        {user?.role === "admin" ? <AdminDashboard /> : <Redirect to="/login" />}
      </Route>
      <Route path="/admin/clients/new">
        {user?.role === "admin" ? <NewClientPage /> : <Redirect to="/login" />}
      </Route>
      <Route path="/admin/clients/:clientId">
        {(params) => user?.role === "admin" ? <ClientDetailPage /> : <Redirect to="/login" />}
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

      <Route path="/">
        {user ? (
          user.role === "admin" ? <Redirect to="/admin/dashboard" /> : <Redirect to="/client/dashboard" />
        ) : (
          <LandingPage />
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
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
