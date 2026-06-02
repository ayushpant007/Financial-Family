// src/components/ui/AssetGroupView.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CircularNavigation from "@/components/ui/cicular-navigation-bar";
import { formatCurrency } from "@/lib/utils-format";
import { 
  Plus, 
  Sparkles, 
  TrendingUp, 
  Pencil, 
  Trash2, 
  Compass,
  BarChart3,
  Landmark,
  RefreshCw,
  Shield,
  Coins
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculatePFCurrentValue, calculateMFCurrentValue } from "@/components/fixed-income-valuation";

interface Asset {
  id: number;
  assetType: string;
  value?: number;
  familyMemberId?: number | null;
  data: Record<string, any>;
}

interface AssetGroupViewProps {
  assets: Asset[] | undefined;
  selectedMemberId: number | null;
  onAddAsset: (type: string) => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (assetId: number) => void;
}

export const ASSET_TYPES = [
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "stock", label: "Stock" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "recurring_deposit", label: "Recurring Deposit" },
  { value: "provident_fund", label: "Provident Fund" },
  { value: "cash_bank", label: "Cash & Bank" },
];

export const ASSET_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  stock: "Stock",
  fixed_deposit: "Fixed Deposit",
  recurring_deposit: "Recurring Deposit",
  provident_fund: "Provident Fund",
  cash_bank: "Cash & Bank",
};

export const GROUP_META: Record<string, { label: string; plural: string; gradient: string; badgeCls: string; color: string; icon: string }> = {
  mutual_fund:       { label: "Mutual Fund",        plural: "Mutual Funds",       gradient: "from-amber-400 to-yellow-300",  badgeCls: "bg-amber-50 text-amber-700 border-amber-200",    color: "#f59e0b", icon: "📈" },
  stock:             { label: "Stock",              plural: "Stocks",             gradient: "from-emerald-500 to-teal-400",  badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "#10b981", icon: "📊" },
  fixed_deposit:     { label: "Fixed Deposit",     plural: "Fixed Deposits",     gradient: "from-blue-500 to-indigo-400",   badgeCls: "bg-blue-50 text-blue-700 border-blue-200",       color: "#3b82f6", icon: "🏦" },
  recurring_deposit: { label: "Recurring Deposit", plural: "Recurring Deposits", gradient: "from-violet-500 to-purple-400", badgeCls: "bg-violet-50 text-violet-700 border-violet-200", color: "#8b5cf6", icon: "🔄" },
  provident_fund:    { label: "PF / PPF",          plural: "Provident Fund",     gradient: "from-orange-500 to-rose-400",   badgeCls: "bg-orange-50 text-orange-700 border-orange-200", color: "#f97316", icon: "🛡️" },
  cash_bank:         { label: "Cash & Bank",       plural: "Cash & Bank",        gradient: "from-slate-500 to-slate-400",   badgeCls: "bg-slate-100 text-slate-600 border-slate-200",   color: "#64748b", icon: "💵" },
};

export const ASSET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mutual_fund: TrendingUp,
  stock: BarChart3,
  fixed_deposit: Landmark,
  recurring_deposit: RefreshCw,
  provident_fund: Shield,
  cash_bank: Coins,
};

export function AssetGroupView({
  assets,
  selectedMemberId,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
}: AssetGroupViewProps) {
  const filteredAssets = assets?.filter(
    (a) => (a.familyMemberId ?? null) === (selectedMemberId ?? null)
  ) ?? [];

  // Build groups similar to dashboard implementation
  const groups = ASSET_TYPES.map((t) => ({
    typeKey: t.value,
    meta: GROUP_META[t.value] ?? {
      label: t.label,
      plural: t.label,
      gradient: "from-slate-400 to-slate-300",
      badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
      color: "#94a3b8",
      icon: "💼",
    },
    items: filteredAssets.filter((a) => a.assetType === t.value),
  })).filter((g) => g.items.length > 0);

  const [activeAssetTab, setActiveAssetTab] = useState(0);
  const [isCircularNavOpen, setIsCircularNavOpen] = useState(false);

  if (groups.length === 0) {
    return (
      <Card className="border-slate-200 border-dashed bg-slate-50/50 rounded-2xl">
        <CardContent className="py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-500 font-semibold">No assets yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first asset to get started</p>
        </CardContent>
      </Card>
    );
  }

  const safeTab = Math.min(activeAssetTab, groups.length - 1);
  const activeGroup = groups[safeTab];

  const circularNavItems = groups.map((g, index) => ({
    name: g.meta.label,
    icon: ASSET_ICONS[g.typeKey] ?? Compass,
    href: "#",
    onClick: () => {
      setActiveAssetTab(index);
    },
  }));

  // Helper to calculate display value
  const getDisplayValue = (asset: Asset) => {
    if (asset.assetType === "provident_fund")
      return calculatePFCurrentValue(asset.data).currentValue;
    if (asset.data?.investmentMethod && asset.data.investmentMethod !== "Lump sum")
      return calculateMFCurrentValue(asset.data);
    if (asset.value && asset.value > 0) return asset.value;
    if (asset.data?.amount) return parseFloat(asset.data.amount);
    if (asset.data?.investmentAmount) return parseFloat(asset.data.investmentAmount);
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Asset Navigation Trigger */}
      <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur-md border border-amber-500/25 p-4 rounded-2xl shadow-xl shadow-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-500">
            <Compass className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">Currently Viewing</p>
            <p className="text-sm font-extrabold text-slate-100">{activeGroup.meta.label}</p>
          </div>
        </div>
        <Button
          onClick={() => setIsCircularNavOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border border-amber-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20"
        >
          <Compass className="w-4 h-4" /> Switch Asset Class
        </Button>
      </div>
      <CircularNavigation
        isOpen={isCircularNavOpen}
        toggleMenu={() => setIsCircularNavOpen(!isCircularNavOpen)}
        navItems={circularNavItems}
      />
      {/* Summary Dashboard */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-md rounded-3xl">
        <div className={`h-1.5 w-full bg-gradient-to-r ${activeGroup.meta.gradient}`} />
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                {activeGroup.meta.label} Portfolio Summary
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Unified performance metrics for all {activeGroup.items.length} dynamic asset holdings
              </p>
            </div>
            <Button
              onClick={() => {
                // placeholder for explore action
              }}
              className={`bg-gradient-to-r ${activeGroup.meta.gradient} hover:opacity-90 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10`}
            >
              Explore Holdings & Visualisation
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-50/50 border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Total Invested Amount</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {formatCurrency(
                  activeGroup.items.reduce((sum, a) => sum + getDisplayValue(a), 0)
                )}
              </p>
            </Card>
            <Card className="bg-slate-50/50 border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Current Market Value</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {formatCurrency(
                  activeGroup.items.reduce((sum, a) => sum + getDisplayValue(a), 0) // placeholder same as invested
                )}
              </p>
            </Card>
            <Card className="bg-slate-50/50 border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Gain / Loss</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">--</p>
            </Card>
          </div>
        </CardContent>
      </Card>
      {/* Asset List for active group */}
      <div className="space-y-4">
        {activeGroup.items.map((asset) => (
          <div key={asset.id} className="p-4 md:p-5 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-all group shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="secondary" className="text-[9px] md:text-[10px] bg-slate-100 text-slate-700 border-slate-200 uppercase tracking-wider">
                    {ASSET_LABELS[asset.assetType] ?? asset.assetType}
                  </Badge>
                </div>
                <p className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                  {formatCurrency(getDisplayValue(asset))}
                </p>
                
                {/* Detailed view of asset metadata */}
                {asset.assetType === "mutual_fund" && (
                  <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Scheme</span><span className="text-slate-700 font-semibold">{asset.data.assetName}</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Type</span><span className="text-slate-700 font-semibold">{asset.data.transactionType}</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Units</span><span className="text-slate-700 font-semibold">{asset.data.units}</span></p>
                    <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">Price</span><span className="text-slate-900 font-bold">{formatCurrency(parseFloat(asset.data.price || "0"))}</span></p>
                  </div>
                )}
                {asset.assetType === "stock" && (
                  <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Stock</span><span className="text-slate-700 font-semibold">{asset.data.assetName}</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Type</span><span className="text-slate-700 font-semibold">{asset.data.transactionType}</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Units</span><span className="text-slate-700 font-semibold">{asset.data.units}</span></p>
                    <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">Price</span><span className="text-slate-900 font-bold">{formatCurrency(parseFloat(asset.data.price || "0"))}</span></p>
                  </div>
                )}
                {asset.assetType === "fixed_deposit" && (
                  <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Institution</span><span className="text-slate-700 font-semibold">{asset.data.institutionName}</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Rate</span><span className="text-slate-700 font-semibold">{asset.data.interestRate}%</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Payout</span><span className="text-slate-700 font-semibold">{asset.data.payoutType}</span></p>
                    <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">Start</span><span className="text-slate-900 font-bold">{asset.data.startDate}</span></p>
                  </div>
                )}
                {asset.assetType === "recurring_deposit" && (
                  <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Institution</span><span className="text-slate-700 font-semibold">{asset.data.institutionName}</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Monthly</span><span className="text-slate-700 font-semibold">{formatCurrency(parseFloat(asset.data.monthlyInvestment || "0"))}</span></p>
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Rate</span><span className="text-slate-700 font-semibold">{asset.data.interestRate}%</span></p>
                    <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">Start</span><span className="text-slate-900 font-bold">{asset.data.startDate}</span></p>
                  </div>
                )}
                {asset.assetType === "provident_fund" && (
                  <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Type</span><span className="text-slate-700 font-semibold">{asset.data.accountType}</span></p>
                    {asset.data.accountType === "EPF" ? (
                      <>
                        <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Salary</span><span className="text-slate-700 font-semibold">{formatCurrency(parseFloat(asset.data.basicSalary || "0"))}</span></p>
                        <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Contribution</span><span className="text-slate-700 font-semibold">{asset.data.employeeContributionPercent || 12}%</span></p>
                      </>
                    ) : (
                      <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Annual Pay</span><span className="text-slate-700 font-semibold">{formatCurrency(parseFloat(asset.data.totalContribution || "0"))}</span></p>
                    )}
                    <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">Maturity</span><span className="text-slate-900 font-bold">{asset.data.maturityDate}</span></p>
                  </div>
                )}
                {asset.assetType === "cash_bank" && (
                  <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Bank</span><span className="text-slate-700 font-semibold">{asset.data.bankName}</span></p>
                    <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">Type</span><span className="text-slate-900 font-bold">{asset.data.accountType}</span></p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white"
                    onClick={() => onEditAsset(asset)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      if (confirm("Delete asset?")) onDeleteAsset(asset.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
