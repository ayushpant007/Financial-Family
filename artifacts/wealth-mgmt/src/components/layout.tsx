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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  // State to track if we're on mobile
  const [isMobile, setIsMobile] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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
        setLocation("/login");
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
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-72 glass shadow-2xl flex flex-col transition-all duration-300 ease-in-out z-50 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isMobile ? "rounded-r-3xl" : ""}`}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b border-border/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground uppercase">Financial</span>
              <span className="text-xs font-semibold text-secondary -mt-1 uppercase tracking-widest">Family</span>
            </div>
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-full">
               <PanelLeft className="h-5 w-5" />
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
                      ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20 scale-[1.02]" 
                      : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-secondary-foreground" : "text-muted-foreground"}`} />
                  <span className="font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/10 p-6 bg-primary/5">
          <div className="mb-6 flex items-center gap-3 px-1">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{user.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start gap-3 border-border/20 bg-background/50 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${!isMobile && sidebarOpen ? "pl-72" : "pl-0"}`}>
        <header className="flex items-center justify-between gap-4 h-16 px-4 md:px-8 border-b border-border/10 bg-background/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-primary/5 rounded-full">
              {sidebarOpen && !isMobile ? <PanelLeft className="h-5 w-5" /> : <PanelRight className="h-5 w-5" />}
            </Button>
            {isMobile && (
              <span className="font-bold text-sm uppercase tracking-tight text-foreground/80">
                Dashboard
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
             {/* Potential Header Elements */}
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
          {children}
        </div>
      </main>
    </div>
  );
}
