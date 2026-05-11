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

export default function ClientsListPage() {
  const [search, setSearch] = useState("");
  const { data: clients, isLoading } = useListClients();
  const deleteClient = useDeleteClient();
  const queryClient = useQueryClient();

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">{clients?.length ?? 0} total clients</p>
          </div>
          <Link href="/admin/clients/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="h-6 bg-muted animate-pulse rounded w-48 mb-2" />
                  <div className="h-4 bg-muted animate-pulse rounded w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No clients found</p>
              <p className="text-sm text-muted-foreground">
                {search ? "Try a different search term" : "Add your first client to get started"}
              </p>
              {!search && (
                <Link href="/admin/clients/new">
                  <Button size="sm" className="mt-2 gap-2">
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
    <Card className="hover:shadow-md transition-all border-border/10 group overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shadow-inner">
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground truncate">{client.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                @{client.username} {client.email ? `· ${client.email}` : ""}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-6 bg-muted/20 sm:bg-transparent -mx-4 -mb-4 p-4 sm:p-0 border-t sm:border-0">
            {summary && (
              <div className="flex items-center gap-6 text-left sm:text-right">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Net Worth</p>
                  <p className={`text-sm font-black ${summary.netWorth >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatCurrency(summary.netWorth)}
                  </p>
                </div>
                <div className="hidden xs:block">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Assets</p>
                  <p className="text-sm font-bold text-foreground/80">{formatCurrency(summary.totalAssets)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full"
                onClick={(e) => { e.preventDefault(); onDelete(client.id, client.name); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Link href={`/admin/clients/${client.id}`}>
                <Button variant="secondary" size="sm" className="gap-2 h-9 rounded-full px-4 font-bold shadow-sm">
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
