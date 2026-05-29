import { useGetDashboardOverview, useListClients, useGetClientSummary, getGetClientSummaryQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { formatCurrency } from "@/lib/utils-format";
import { Users, TrendingUp, TrendingDown, IndianRupee, ArrowRight, PlusCircle, Landmark, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { usePageBackground } from "@/hooks/usePageBackground";

const ASSET_LABELS: Record<string, string> = {
  mutual_fund_stock: "Mutual Funds / Stocks",
  fixed_deposit: "Fixed Deposits",
  recurring_deposit: "Recurring Deposits",
  provident_fund: "Provident Fund",
  cash_bank: "Cash & Bank",
};

const CHART_COLORS = ["#C9A84C", "#334155", "#64748B", "#94A3B8", "#CBD5E1"];

function RecentClientCard({ client }: { client: any }) {
  const { data: summary, isLoading } = useGetClientSummary(client.id, {
    query: { enabled: !!client.id, queryKey: getGetClientSummaryQueryKey(client.id) } as any
  });

  return (
    <Link href={`/admin/clients/${client.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group gap-4">
        
        {/* Avatar and Info Block */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 font-black text-lg group-hover:bg-slate-950 group-hover:text-amber-400 group-hover:border-slate-950 flex-shrink-0 transition-all duration-300">
            {client.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors truncate" title={client.name}>{client.name}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5 truncate" title={client.email}>
              {client.email ?? "No Email"}
            </p>
          </div>
        </div>

        {/* Stats & Actions Row */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-6 sm:gap-12 w-full sm:w-auto">
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading stats
            </div>
          ) : summary ? (
            <>
              <div className="text-left sm:text-right min-w-[90px]">
                <p className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">Net Worth</p>
                <p className={`text-sm font-black tabular-nums mt-0.5 ${summary.netWorth >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                  {formatCurrency(summary.netWorth)}
                </p>
              </div>
              <div className="text-left sm:text-right min-w-[90px]">
                <p className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">Assets</p>
                <p className="text-sm font-bold text-slate-700 tabular-nums mt-0.5">{formatCurrency(summary.totalAssets)}</p>
              </div>
              <div className="text-left sm:text-right min-w-[90px]">
                <p className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">Liabilities</p>
                <p className="text-sm font-bold text-rose-500 tabular-nums mt-0.5">{formatCurrency(summary.totalLiabilities)}</p>
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-400">Summary unavailable</span>
          )}

          <div className="text-right flex-shrink-0 ml-auto sm:ml-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-slate-950 transition-colors">
              Manage Portfolio
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
        
      </div>
    </Link>
  );
}

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
        
        {/* Advisor Command Center Header */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-950/20 border border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-slate-800 text-amber-400 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border border-slate-700/50 uppercase">
                <Landmark className="h-3 w-3" /> System Administration
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white mt-1">Advisor Command Center</h1>
              <p className="text-slate-400 text-sm max-w-xl">
                Oversight of system-wide Assets Under Management (AUM), client portfolios, asset class distributions, and advisor action items.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/clients/new">
                <button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-5 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer transition-all duration-300">
                  <PlusCircle className="h-4 w-4" />
                  Onboard New Client
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Overview Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">System Overview</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time aggregate portfolio parameters</p>
          </div>
        </div>

        {/* KPI Summary Grid - Fully Responsive with Full Width Values to prevent any truncation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between min-h-[160px]">
            <CardContent className="p-6 flex flex-col justify-between h-full flex-grow">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Clients</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Active client portfolios</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-inner flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {isLoading ? "—" : overview?.totalClients ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-emerald-200 bg-emerald-50/10 shadow-sm rounded-3xl overflow-hidden hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between min-h-[160px]">
            <CardContent className="p-6 flex flex-col justify-between h-full flex-grow">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-emerald-600/80 uppercase tracking-widest">Total AUM</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Valued holdings under advisement</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-600 shadow-inner flex-shrink-0">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {isLoading ? "—" : formatCurrency(overview?.totalAUM ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-rose-200 bg-rose-50/10 shadow-sm rounded-3xl overflow-hidden hover:shadow-md hover:border-rose-300 transition-all flex flex-col justify-between min-h-[160px]">
            <CardContent className="p-6 flex flex-col justify-between h-full flex-grow">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-rose-600/80 uppercase tracking-widest">Total Leverage</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Outstanding client liabilities</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100/50 flex items-center justify-center text-rose-600 shadow-inner flex-shrink-0">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight tabular-nums">
                  {isLoading ? "—" : formatCurrency(overview?.totalLiabilities ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-amber-200 bg-amber-50/10 shadow-sm rounded-3xl overflow-hidden hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between min-h-[160px]">
            <CardContent className="p-6 flex flex-col justify-between h-full flex-grow">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-amber-700/80 uppercase tracking-widest">Net Advisory Wealth</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Net asset value total</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-500 shadow-inner flex-shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {isLoading ? "—" : formatCurrency(overview?.totalNetWorth ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Panel - Row-wise stacking to maximize visual space */}
        <div className="space-y-6">
          
          {/* Row 1: System Asset Allocation & Breakdown (Full Width) */}
          <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Landmark className="h-4.5 w-4.5 text-slate-400" />
                System Asset Allocation &amp; Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-300 text-sm">No asset data yet</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Column: Recharts Pie Chart (4 out of 12 columns) */}
                  <div className="md:col-span-4 flex justify-center py-4">
                    <div className="w-full max-w-[240px]">
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie 
                            data={chartData} 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={95} 
                            innerRadius={60}
                            dataKey="value" 
                            nameKey="name" 
                            stroke="#fff" 
                            strokeWidth={2.5}
                          >
                            {chartData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#0f172a', fontSize: '12px' }}
                            formatter={(value: number) => formatCurrency(value)} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right Column: 2-Column Grid of Beautiful Breakdown Cards (8 out of 12 columns) */}
                  <div className="md:col-span-8">
                    {(() => {
                      const totalAssetVal = chartData.reduce((acc, item) => acc + item.value, 0);
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {chartData.map((item, index) => {
                            const pct = totalAssetVal > 0 ? (item.value / totalAssetVal) * 100 : 0;
                            const gradient = [
                              "from-amber-400 to-amber-600",
                              "from-slate-700 to-slate-900",
                              "from-slate-500 to-slate-700",
                              "from-slate-400 to-slate-500",
                              "from-slate-200 to-slate-300"
                            ][index % 5];
                            const dotColor = ["bg-[#C9A84C]", "bg-[#334155]", "bg-[#64748B]", "bg-[#94A3B8]", "bg-[#CBD5E1]"][index % 5];
                            
                            return (
                              <div key={item.name} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                                    <span className={`h-2.5 w-2.5 rounded-full ${dotColor} flex-shrink-0`} />
                                    {item.name}
                                  </span>
                                  <span className="text-xs font-black text-slate-900 whitespace-nowrap">{formatCurrency(item.value)}</span>
                                </div>
                                
                                <div className="flex items-center justify-between text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-2.5 mb-0.5">
                                  <span>Allocation</span>
                                  <span>{pct.toFixed(1)}% of total AUM</span>
                                </div>
                                
                                <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden mt-1 shadow-inner">
                                  <div
                                    className={`bg-gradient-to-r ${gradient} h-full rounded-full transition-all duration-700`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 2: Recent Clients (Full Width) */}
          <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-slate-400" />
                Recent Clients
              </CardTitle>
              <Link href="/admin/clients">
                <Button variant="ghost" size="sm" className="gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">
                  View all rosters <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              {!clients || clients.length === 0 ? (
                <div className="py-12 text-center text-slate-300 text-sm">No onboarded clients found</div>
              ) : (
                <div className="space-y-4">
                  {(overview?.recentClients ?? clients.slice(0, 5)).map((client) => (
                    <RecentClientCard key={client.id} client={client} />
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
