import { useState } from "react";
import { useListClients, useDeleteClient, useGetClientSummary, getListClientsQueryKey, getGetClientSummaryQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { formatCurrency } from "@/lib/utils-format";
import { PlusCircle, Search, ArrowRight, Trash2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePageBackground } from "@/hooks/usePageBackground";

export default function ClientsListPage() {
  const [search, setSearch] = useState("");
  const { data: clients, isLoading } = useListClients();
  const deleteClient = useDeleteClient();
  const queryClient = useQueryClient();
  
  usePageBackground('light');

  const filtered = (clients ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Delete client "${name}"? This will remove all their financial data.`)) return;
    deleteClient.mutate(
      { clientId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Roster Workspace Header */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-950/20 border border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-slate-800 text-amber-400 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border border-slate-700/50 uppercase">
                <Users className="h-3.5 w-3.5" /> Portfolio Rosters
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white mt-1">Client Roster Workspace</h1>
              <p className="text-slate-400 text-sm max-w-xl">
                Oversight and management of system-wide client profiles, contact metrics, and net worth parameters.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 flex-shrink-0">
              <Link href="/admin/clients/new">
                <button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-5 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer transition-all duration-300">
                  <PlusCircle className="h-4 w-4" />
                  Onboard New Client
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Info & Metrics Counter row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Active Client Registry</h2>
            <p className="text-xs text-slate-500 mt-1">
              {isLoading ? "Loading system rosters..." : `${filtered.length} client${filtered.length === 1 ? "" : "s"} found of ${clients?.length ?? 0} total registered`}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search roster by client name, username, or contact email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm rounded-2xl focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 h-12 transition-all text-sm"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-slate-200/60 bg-white/60 rounded-3xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 animate-pulse">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl">
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                <Users className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-extrabold text-xs text-slate-400 uppercase tracking-widest mt-2">No clients found</p>
              <p className="text-xs text-slate-500 text-center max-w-sm mt-0.5">
                {search ? "No matches correspond to the query. Try verifying spelling or parameters." : "No clients have been registered yet. Get started by adding a profile."}
              </p>
              {!search && (
                <Link href="/admin/clients/new">
                  <Button size="sm" className="mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-4 h-9 rounded-xl flex items-center gap-2 transition-all shadow-sm">
                    <PlusCircle className="h-4 w-4" /> Onboard Client
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 pl-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Client details</th>
                    <th className="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Net Worth</th>
                    <th className="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right hidden sm:table-cell">Assets</th>
                    <th className="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right hidden sm:table-cell">Liabilities</th>
                    <th className="p-4 pr-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((client) => (
                    <ClientTableRow key={client.id} client={client} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function ClientTableRow({ client, onDelete }: { client: any; onDelete: (id: number, name: string) => void }) {
  const { data: summary, isLoading } = useGetClientSummary(client.id, {
    query: { enabled: !!client.id, queryKey: getGetClientSummaryQueryKey(client.id) } as any,
  });

  return (
    <tr className="hover:bg-slate-50/50 transition-all duration-200 group">
      {/* 1. Client Avatar and Info Block */}
      <td className="p-4 pl-6 align-middle">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 font-black text-sm group-hover:bg-slate-950 group-hover:text-amber-400 group-hover:border-slate-950 flex-shrink-0 transition-all duration-300">
            {client.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors truncate" title={client.name}>
              {client.name}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5 truncate max-w-[240px]" title={client.email}>
              @{client.username} {client.email ? `· ${client.email}` : ""}
            </p>
          </div>
        </div>
      </td>

      {/* 2. Net Worth */}
      <td className="p-4 text-right align-middle">
        {isLoading ? (
          <span className="text-xs text-slate-400">Loading...</span>
        ) : summary ? (
          <span className={`text-sm font-black tabular-nums ${summary.netWorth >= 0 ? "text-slate-900" : "text-rose-600"}`}>
            {formatCurrency(summary.netWorth)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* 3. Total Assets */}
      <td className="p-4 text-right align-middle hidden sm:table-cell">
        {isLoading ? (
          <span className="text-xs text-slate-400">Loading...</span>
        ) : summary ? (
          <span className="text-sm font-bold text-slate-700 tabular-nums">
            {formatCurrency(summary.totalAssets)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* 4. Liabilities */}
      <td className="p-4 text-right align-middle hidden sm:table-cell">
        {isLoading ? (
          <span className="text-xs text-slate-400">Loading...</span>
        ) : summary ? (
          <span className="text-sm font-bold text-rose-500 tabular-nums">
            {formatCurrency(summary.totalLiabilities)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* 5. Actions */}
      <td className="p-4 pr-6 text-right align-middle">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(client.id, client.name); }}
            title="Delete Client Portfolio"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </Button>
          <Link href={`/admin/clients/${client.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 rounded-xl px-4 font-black border-slate-200 text-slate-700 hover:bg-slate-950 hover:text-amber-400 hover:border-slate-950 transition-all shadow-sm cursor-pointer text-[11px] whitespace-nowrap">
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}
