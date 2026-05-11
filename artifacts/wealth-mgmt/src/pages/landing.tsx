import { Gift, Shield, BarChart3, Users, LayoutDashboard } from 'lucide-react'
import { AnimatedFeatureSpotlight3D } from '@/components/ui/animated-feature-spotlight3d'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const [, setLocation] = useLocation()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="bg-primary p-2 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Financial Family</span>
        </div>
        <Button variant="outline" onClick={() => setLocation('/login')}>Sign In</Button>
      </header>

      {/* Hero / Main Spotlight */}
      <main className="w-full flex-1 flex flex-col items-center py-12 md:py-20 px-6 space-y-24">
        <AnimatedFeatureSpotlight3D
          preheaderIcon={<Shield className="w-4 h-4 text-primary" />}
          preheaderText="Secure Wealth Management"
          heading={
            <>
              Protect Your <span className="text-primary">Family's Future</span> Today
            </>
          }
          description="A private, secure platform for high-net-worth families to track assets, manage documents, and plan for generations. Experience wealth advisory with a personal touch."
          buttonText="Get Started"
          buttonProps={{ onClick: () => setLocation('/login') }}
          imageUrl="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=1000"
          imageAlt="Secure Wealth Management"
        />

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          <div className="p-6 rounded-2xl border bg-card/50 space-y-4">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-bold">Portfolio Insights</h3>
            <p className="text-muted-foreground">Deep dive into your assets and liabilities with real-time analytics and reporting.</p>
          </div>
          <div className="p-6 rounded-2xl border bg-card/50 space-y-4">
            <Users className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-bold">Family Office</h3>
            <p className="text-muted-foreground">Manage wealth across multiple family members with customized access and privacy controls.</p>
          </div>
          <div className="p-6 rounded-2xl border bg-card/50 space-y-4">
            <Shield className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-bold">Document Vault</h3>
            <p className="text-muted-foreground">Securely store and share critical family documents with military-grade encryption.</p>
          </div>
        </section>

        {/* Second Spotlight (Mobile-friendly) */}
        <AnimatedFeatureSpotlight3D
          className="bg-primary/5 border-primary/10"
          preheaderIcon={<Gift className="w-4 h-4 text-primary" />}
          preheaderText="Smart Advisory"
          heading={
            <>
              Personalized <span className="text-primary">Financial Planning</span>
            </>
          }
          description="Our advisory platform uses smart insights to help you make informed decisions about your legacy, taxes, and investments."
          buttonText="Learn More"
          buttonProps={{ variant: "secondary", onClick: () => setLocation('/login') }}
          imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000"
          imageAlt="Financial Planning"
        />
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 text-sm text-muted-foreground">
          <p>© 2026 Financial Family Private Office. All rights reserved.</p>
          <div className="flex space-x-8">
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
