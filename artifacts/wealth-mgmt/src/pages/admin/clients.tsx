import { useState } from "react";
import { useListClients, useDeleteClient, useGetClientSummary, getListClientsQueryKey, getGetClientSummaryQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout";
import { formatCurrency } from "@/lib/utils-format";
import { PlusCircle, Search, ArrowRight, Trash2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollingFeatureShowcase } from "@/components/ui/interactive-scrolling-story-component";

import { usePageBackground } from "@/hooks/usePageBackground";

const CLIENTS_SLIDES = [
  {
    title: "Know Every Client, Deeply",
    description: "Each client profile is a living document — net worth, asset mix, liabilities, family structure, and documents, all in one place.",
    image: "/assets/step1.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Instant Financial Snapshot",
    description: "At a glance, see net worth, total assets, and outstanding liabilities for every family you advise — no digging required.",
    image: "/assets/assets.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Search & Filter Instantly",
    description: "Find any client by name, username, or email in milliseconds. Your entire client roster, always at your fingertips.",
    image: "/assets/security.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

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
        <ScrollingFeatureShowcase
          slides={CLIENTS_SLIDES}
          height="440px"
          ctaText="Add New Client"
          ctaHref="/admin/clients/new"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="text-sm text-slate-500 mt-1">{clients?.length ?? 0} total clients</p>
          </div>
          <Link href="/admin/clients/new">
            <Button className="gap-2 shadow-lg shadow-primary/20 h-11">
              <PlusCircle className="h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm focus:ring-2 focus:ring-primary/20 h-11 transition-all"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-panel border-slate-200 bg-white/60">
                <CardContent className="py-4">
                  <div className="h-6 bg-slate-100 animate-pulse rounded w-48 mb-2" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-panel border-slate-200 bg-white/60">
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                <Users className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-900">No clients found</p>
              <p className="text-sm text-slate-500">
                {search ? "Try a different search term" : "Add your first client to get started"}
              </p>
              {!search && (
                <Link href="/admin/clients/new">
                  <Button size="sm" className="mt-2 gap-2 shadow-md shadow-primary/10">
                    <PlusCircle className="h-4 w-4" /> Add Client
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((client) => (
              <ClientRow key={client.id} client={client} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function ClientRow({ client, onDelete }: { client: any; onDelete: (id: number, name: string) => void }) {
  const { data: summary } = useGetClientSummary(client.id, {
    query: { enabled: !!client.id, queryKey: getGetClientSummaryQueryKey(client.id) } as any,
  });

  return (
    <Card className="glass-panel border-slate-200/60 bg-white/60 hover:bg-white transition-all group overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-300">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg border border-slate-200 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors">{client.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                @{client.username} {client.email ? `· ${client.email}` : ""}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-8">
            {summary && (
              <div className="flex items-center gap-8 text-left sm:text-right">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Net Worth</p>
                  <p className={`text-base font-black ${summary.netWorth >= 0 ? "text-slate-900" : "text-rose-500"}`}>
                    {formatCurrency(summary.netWorth)}
                  </p>
                </div>
                <div className="hidden md:block">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Assets</p>
                  <p className="text-base font-bold text-slate-600">{formatCurrency(summary.totalAssets)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                onClick={(e) => { e.preventDefault(); onDelete(client.id, client.name); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Link href={`/admin/clients/${client.id}`}>
                <Button variant="outline" size="sm" className="gap-2 h-10 rounded-xl px-5 font-bold border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
                  View <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
