import { useGetDashboardOverview, useListClients } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { formatCurrency } from "@/lib/utils-format";
import { Users, TrendingUp, TrendingDown, DollarSign, ArrowRight, PlusCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AnimatedFeatureSpotlight3D } from "@/components/ui/animated-feature-spotlight3d";
import { Sparkles } from "lucide-react";

const ASSET_LABELS: Record<string, string> = {
  mutual_fund_stock: "Mutual Funds / Stocks",
  fixed_deposit: "Fixed Deposits",
  recurring_deposit: "Recurring Deposits",
  provident_fund: "Provident Fund",
  cash_bank: "Cash & Bank",
};

const CHART_COLORS = ["#1e3a5f", "#c9a54a", "#2d5a8e", "#8b6914", "#4a7fad"];

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: overview, isLoading } = useGetDashboardOverview();
  const { data: clients } = useListClients();

  const chartData = overview?.assetBreakdown.map((item) => ({
    name: ASSET_LABELS[item.assetType] || item.assetType,
    value: item.total,
  })) ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        <AnimatedFeatureSpotlight3D
          className="bg-primary/5 border-primary/20 py-8"
          preheaderIcon={<Sparkles className="w-4 h-4 text-primary" />}
          preheaderText="Portfolio Administration"
          heading={
            <>
              Manage Your <span className="text-primary">Wealth Ecosystem</span>
            </>
          }
          description={`You are currently managing ${overview?.totalClients ?? 0} clients with a total AUM of ${formatCurrency(overview?.totalAUM ?? 0)}.`}
          buttonText="Add New Client"
          buttonProps={{ onClick: () => setLocation("/admin/clients/new") }}
          imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000"
          imageAlt="Admin Overview"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Advisory portfolio overview</p>
          </div>
          <Link href="/admin/clients/new">
            <Button className="gap-2 w-full sm:w-auto h-11 sm:h-10">
              <PlusCircle className="h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Total Clients</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{isLoading ? "—" : overview?.totalClients ?? 0}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 border-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Total AUM</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{isLoading ? "—" : formatCurrency(overview?.totalAUM ?? 0)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/5 border-red-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Total Liabilities</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{isLoading ? "—" : formatCurrency(overview?.totalLiabilities ?? 0)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/10">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gold-gradient border-none shadow-xl shadow-secondary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-secondary-foreground/60 uppercase tracking-[0.2em]">Total Net Worth</p>
                  <p className="text-2xl font-bold text-secondary-foreground mt-1">{isLoading ? "—" : formatCurrency(overview?.totalNetWorth ?? 0)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No asset data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Clients</CardTitle>
              <Link href="/admin/clients">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!clients || clients.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No clients yet</div>
              ) : (
                <div className="space-y-3">
                  {(overview?.recentClients ?? clients.slice(0, 5)).map((client) => (
                    <Link key={client.id} href={`/admin/clients/${client.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.email ?? "No email"}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
