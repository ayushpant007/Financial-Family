import { Gift, Shield, BarChart3, Users, LayoutDashboard, Sparkles } from 'lucide-react'
import { AnimatedFeatureSpotlight3D } from '@/components/ui/animated-feature-spotlight3d'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { ScrollingFeatureShowcase } from '@/components/ui/interactive-scrolling-story-component'
import { usePageBackground } from "@/hooks/usePageBackground";

const LANDING_SLIDES = [
  {
    title: "Generations of Wealth, Unified",
    description: "A private command centre for India's high-net-worth families — where every asset, every rupee, and every legacy decision lives in one secure, advisor-curated vault.",
    image: "/assets/step1.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Live Portfolio Intelligence",
    description: "Real-time NAV prices from AMFI, live NSE stock quotes, and auto-compounded FD and PPF projections — your wealth, accurately valued every single day.",
    image: "/assets/assets.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Family Office, Digitised",
    description: "Track assets and liabilities across every family member — parents, spouse, children — with a visual family tree and per-member financial drill-down.",
    image: "/assets/step1.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Invitation-Only. Bank-Grade Security.",
    description: "Access is by invitation from your advisor only. Every file, every transaction, every record is encrypted and stored in a private, auditable vault.",
    image: "/assets/security.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation()
  usePageBackground('light');

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center">
      {/* Navigation */}
      <header className="w-full fixed top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
              <img src="/logo.jpg" alt="Financial Family" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-['Cormorant_Garamond']">Financial Family</span>
          </div>
          <Button 
            className="bg-primary text-white hover:bg-primary/90 transition-all font-medium h-10 px-6 rounded-lg shadow-lg shadow-primary/20"
            onClick={() => setLocation('/login')}
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero / Main Spotlight */}
      <main className="w-full flex-1 flex flex-col items-center pt-32 pb-12 md:pb-20 px-6 space-y-24">
        <AnimatedFeatureSpotlight3D
          className="glass-panel py-12 border-slate-200 shadow-2xl"
          preheaderIcon={<Shield className="w-4 h-4 text-primary" />}
          preheaderText="Secure Wealth Management"
          heading={
            <span className="text-slate-900">
              Protect Your <span className="text-primary">Family's Future</span> Today
            </span>
          }
          description="A private, secure platform for high-net-worth families to track assets, manage documents, and plan for generations. Experience wealth advisory with a personal touch."
          buttonText="Get Started"
          buttonProps={{ onClick: () => setLocation('/login') }}
          imageUrl="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=1000"
          imageAlt="Secure Wealth Management"
        />

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          <div className="p-8 rounded-2xl glass-panel border-slate-200 bg-white/60 shadow-sm space-y-4 hover:border-primary/40 hover:shadow-xl transition-all group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Portfolio Insights</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Deep dive into your assets and liabilities with real-time analytics and reporting.</p>
          </div>
          <div className="p-8 rounded-2xl glass-panel border-slate-200 bg-white/60 shadow-sm space-y-4 hover:border-primary/40 hover:shadow-xl transition-all group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Family Office</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Manage wealth across multiple family members with customized access and privacy controls.</p>
          </div>
          <div className="p-8 rounded-2xl glass-panel border-slate-200 bg-white/60 shadow-sm space-y-4 hover:border-primary/40 hover:shadow-xl transition-all group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Document Vault</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Securely store and share critical family documents with military-grade encryption.</p>
          </div>
        </section>

        <ScrollingFeatureShowcase
          slides={LANDING_SLIDES}
          height="540px"
          ctaText="Request Access"
          ctaHref="/login"
        />

        {/* Second Spotlight (Mobile-friendly) */}
        <AnimatedFeatureSpotlight3D
          className="glass-panel border-primary/20 bg-primary/5 shadow-xl"
          preheaderIcon={<Sparkles className="w-4 h-4 text-primary" />}
          preheaderText="Smart Advisory"
          heading={
            <span className="text-slate-900">
              Personalized <span className="text-primary">Financial Planning</span>
            </span>
          }
          description="Our advisory platform uses smart insights to help you make informed decisions about your legacy, taxes, and investments."
          buttonText="Learn More"
          buttonProps={{ variant: "secondary", onClick: () => setLocation('/login') }}
          imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000"
          imageAlt="Financial Planning"
        />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 py-16 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
          <div className="flex flex-col items-center md:items-start space-y-4">
            <div className="flex items-center space-x-2">
              <img src="/logo.jpg" alt="Financial Family" className="w-5 h-5 object-contain" />
              <span className="font-bold text-slate-900">Financial Family</span>
            </div>
            <p className="text-xs text-slate-400 text-center md:text-left">© 2026 Financial Family Private Office. All rights reserved.</p>
          </div>
          <div className="flex space-x-8 text-xs font-medium uppercase tracking-widest text-slate-400">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
