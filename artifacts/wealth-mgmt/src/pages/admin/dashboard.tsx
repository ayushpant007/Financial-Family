import { useGetDashboardOverview, useListClients } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { formatCurrency } from "@/lib/utils-format";
import { Users, TrendingUp, TrendingDown, IndianRupee, ArrowRight, PlusCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AnimatedFeatureSpotlight3D } from "@/components/ui/animated-feature-spotlight3d";
import { Sparkles } from "lucide-react";
import { ScrollingFeatureShowcase } from "@/components/ui/interactive-scrolling-story-component";

import { usePageBackground } from "@/hooks/usePageBackground";

const ADMIN_DASHBOARD_SLIDES = [
  {
    title: "Full-Spectrum Wealth Oversight",
    description: "Monitor every rupee across all client portfolios — assets, liabilities, and net worth — from a single command centre designed for serious advisors.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Client Portfolio Analytics",
    description: "Visualise asset allocation breakdowns with live pie charts, sector exposure heatmaps, and automatic liability-to-asset ratios for every client.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Multi-Client AUM Management",
    description: "Onboard new families, assign advisors, and track aggregate AUM growth — all with role-based access and audit trails for full compliance.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Secure Document Administration",
    description: "Upload, organise, and share encrypted financial documents with clients. Every file is version-controlled and access-logged.",
    image: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

const ASSET_LABELS: Record<string, string> = {
  mutual_fund_stock: "Mutual Funds / Stocks",
  fixed_deposit: "Fixed Deposits",
  recurring_deposit: "Recurring Deposits",
  provident_fund: "Provident Fund",
  cash_bank: "Cash & Bank",
};

const CHART_COLORS = ["#C9A84C", "#334155", "#64748B", "#94A3B8", "#CBD5E1"];

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: overview, isLoading } = useGetDashboardOverview();
  const { data: clients } = useListClients();
  
  usePageBackground('light');

  const chartData = overview?.assetBreakdown.map((item) => ({
    name: ASSET_LABELS[item.assetType] || item.assetType,
    value: item.total,
  })) ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        <AnimatedFeatureSpotlight3D
          className="glass-panel py-4 border-slate-200 shadow-xl"
          preheaderIcon={<Sparkles className="w-4 h-4 text-primary" />}
          preheaderText="Portfolio Administration"
          heading={
            <span className="text-slate-900">
              Manage Your <span className="text-primary">Wealth Ecosystem</span>
            </span>
          }
          description={`You are currently managing ${overview?.totalClients ?? 0} clients with a total AUM of ${formatCurrency(overview?.totalAUM ?? 0)}.`}
          buttonText="Add New Client"
          buttonProps={{ onClick: () => setLocation("/admin/clients/new") }}
          imageUrl="/logo.jpg"
          imageAlt="Admin Overview"
        />

        <div data-reveal>
          <ScrollingFeatureShowcase
            slides={ADMIN_DASHBOARD_SLIDES}
            height="460px"
            ctaText="Manage Clients"
            ctaHref="/admin/clients"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-reveal data-reveal-delay="100">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Advisory portfolio overview</p>
          </div>
          <Link href="/admin/clients/new">
            <Button className="gap-2 w-full sm:w-auto h-11 sm:h-10 shadow-lg shadow-primary/10">
              <PlusCircle className="h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" data-reveal data-reveal-delay="200">
          <Card className="glass-panel border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Clients</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{isLoading ? "—" : overview?.totalClients ?? 0}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/5">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-[0.2em]">Total AUM</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{isLoading ? "—" : formatCurrency(overview?.totalAUM ?? 0)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                  <IndianRupee className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-rose-200 bg-rose-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-rose-600/60 uppercase tracking-[0.2em]">Total Liabilities</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{isLoading ? "—" : formatCurrency(overview?.totalLiabilities ?? 0)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center shadow-lg shadow-rose-500/5">
                  <TrendingDown className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-primary/30 bg-primary/5 shadow-xl shadow-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Total Net Worth</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{isLoading ? "—" : formatCurrency(overview?.totalNetWorth ?? 0)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-reveal data-reveal-delay="300">
          <Card className="glass-panel border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-300 text-sm">No asset data yet</div>
              ) : (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={380}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="40%" outerRadius={110} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={2}>
                        {chartData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#0f172a' }}
                        formatter={(value: number) => formatCurrency(value)} 
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ paddingTop: '10px', fontSize: '9px', paddingLeft: '10px', paddingRight: '10px' }}
                        formatter={(value) => <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{value}</span>} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Recent Clients</CardTitle>
              <Link href="/admin/clients">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-slate-500 hover:text-slate-900">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!clients || clients.length === 0 ? (
                <div className="py-8 text-center text-slate-300 text-sm">No clients yet</div>
              ) : (
                <div className="space-y-3">
                  {(overview?.recentClients ?? clients.slice(0, 5)).map((client) => (
                    <Link key={client.id} href={`/admin/clients/${client.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{client.name}</p>
                            <p className="text-xs text-slate-500">{client.email ?? "No email"}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
