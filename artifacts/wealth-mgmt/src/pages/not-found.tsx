import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { usePageBackground } from "@/hooks/usePageBackground";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  usePageBackground('light');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-transparent">
      <Card className="w-full max-w-md mx-4 glass-panel border-slate-200 bg-white/60 shadow-2xl">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 border border-rose-100">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 font-['Cormorant_Garamond']">Page Not Found</h1>
          <p className="mt-4 text-sm text-slate-500 font-['DM_Sans'] leading-relaxed">
            The vault you are looking for does not exist or has been moved to a different generation.
          </p>

          <Link href="/">
            <Button className="mt-8 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
