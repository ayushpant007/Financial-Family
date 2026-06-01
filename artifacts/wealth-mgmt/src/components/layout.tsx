import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  LogOut,
  Wallet,
  FileText,
  PanelLeft,
  PanelRight,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useScrollReveal } from "@/hooks/useScrollReveal";

import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const queryClient = useQueryClient();
  // State to track if we're on mobile
  const [isMobile, setIsMobile] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  useScrollReveal();

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        // Clear all queries to ensure no stale user data persists
        queryClient.clear();
        setLocation("/");
      },
    });
  };

  if (!user) return <>{children}</>;

  const navItems = user.role === "admin" 
    ? [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Clients", href: "/admin/clients", icon: Users },
        { label: "Documents", href: "/admin/documents", icon: FileText },
      ]
    : [
        { label: "My Portfolio", href: "/client/dashboard", icon: Wallet },
        { label: "Family Tree", href: "/client/family-tree", icon: Users },
        { label: "Documents", href: "/client/documents", icon: FileText },
      ];

  return (
    <div className="flex min-h-screen bg-transparent relative overflow-x-hidden text-foreground">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[45] animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-72 glass shadow-2xl flex flex-col transition-all duration-300 ease-in-out z-50 border-r border-slate-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isMobile ? "rounded-r-3xl" : ""}`}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b border-slate-200 px-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100 p-1">
              <img src="/logo.jpg" alt="Financial Family" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 uppercase">Financial</span>
              <span className="text-xs font-semibold text-secondary -mt-1 uppercase tracking-widest">Family</span>
            </div>
          </Link>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-full">
               <PanelLeft className="h-5 w-5 text-slate-500" />
            </Button>
          )}
        </div>
        
        <nav className="flex-1 space-y-2 p-4 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="block group">
                <Button 
                  variant={isActive ? "secondary" : "ghost"} 
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={`w-full justify-start gap-3 h-12 transition-all duration-200 ${
                    isActive 
                      ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/10 scale-[1.02]" 
                      : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-secondary-foreground" : "text-slate-500"}`} />
                  <span className="font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          {/* Contextual Assets & Liabilities shortcuts — visible on client detail / family-tree pages */}
          {(/^\/admin\/clients\/\d+/.test(location) || location.startsWith("/client/family-tree")) && (
            <>
              <div className="pt-3 pb-1 px-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Jump</p>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("switch-tab", { detail: "assets" }));
                  setTimeout(() => {
                    document.getElementById("assets-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                  if (isMobile) setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 h-11 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 group cursor-pointer"
              >
                <Wallet className="h-4.5 w-4.5 text-emerald-500 transition-transform duration-300 group-hover:scale-110" />
                <span>Assets</span>
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("switch-tab", { detail: "liabilities" }));
                  setTimeout(() => {
                    document.getElementById("liabilities-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                  if (isMobile) setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 h-11 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 group cursor-pointer"
              >
                <TrendingDown className="h-4.5 w-4.5 text-rose-500 transition-transform duration-300 group-hover:scale-110" />
                <span>Liabilities</span>
              </button>
            </>
          )}
        </nav>


        <div className="border-t border-slate-200 p-6 bg-slate-50/50">
          <div className="mb-6 flex items-center gap-3 px-1">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-slate-900">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{user.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start gap-3 border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors shadow-sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${!isMobile && sidebarOpen ? "pl-72" : "pl-0"}`}>
        <header className="flex items-center justify-between gap-4 h-16 px-4 md:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-slate-100 rounded-full text-slate-500">
              {sidebarOpen && !isMobile ? <PanelLeft className="h-5 w-5" /> : <PanelRight className="h-5 w-5" />}
            </Button>
            {isMobile && (
              <span className="font-bold text-sm uppercase tracking-tight text-slate-900">
                Dashboard
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
             {/* Potential Header Elements */}
          </div>
        </header>
        <div className="flex-1 p-2 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full" id="main-content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}
