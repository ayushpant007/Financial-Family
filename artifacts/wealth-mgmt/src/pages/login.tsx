import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, User, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { AnimatedFeatureSpotlight3D } from "@/components/ui/animated-feature-spotlight3d";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          if (data.user.role === "admin") {
            setLocation("/admin/dashboard");
          } else {
            setLocation("/client/dashboard");
          }
        },
        onError: () => {},
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden">
      {/* Left Side: Spotlight Section */}
      <div className="flex-1 hidden lg:flex items-center justify-center p-12 bg-primary/5">
        <AnimatedFeatureSpotlight3D
          className="border-none bg-transparent"
          preheaderIcon={<Shield className="w-4 h-4 text-primary" />}
          preheaderText="Secure Wealth Management"
          heading={
            <>
              Protect Your <span className="text-primary">Family's Future</span> Today
            </>
          }
          description="A private, secure platform for high-net-worth families to track assets, manage documents, and plan for generations."
          buttonText="Learn More"
          imageUrl="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=1000"
          imageAlt="Secure Wealth Management"
        />
      </div>

      {/* Mobile Branding (Compact) */}
      <div className="lg:hidden w-full pt-12 pb-4 px-6 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30 mb-6">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Financial <span className="text-primary">Family</span></h1>
        <p className="mt-2 text-muted-foreground text-sm font-medium tracking-wide">PRIVATE CLIENT ADVISORY</p>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-[500px] flex items-center justify-center p-6 md:p-12 lg:border-l border-border/10">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="hidden lg:flex flex-col items-start text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">Financial Family</h1>
            <p className="mt-1 text-muted-foreground text-xs font-semibold tracking-widest uppercase opacity-70">Advisory Platform</p>
          </div>

          <Card className="shadow-none border-border/50">
            <CardHeader className="space-y-1 pb-4 px-0">
              <CardTitle className="text-xl font-semibold">Sign in</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                {login.isError && (
                  <p className="text-sm text-destructive font-medium">Invalid username or password</p>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
                  {login.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
