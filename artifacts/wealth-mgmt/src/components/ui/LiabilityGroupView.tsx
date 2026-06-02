// src/components/ui/LiabilityGroupView.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CircularNavigation from "@/components/ui/cicular-navigation-bar";
import { formatCurrency } from "@/lib/utils-format";
import { 
  Plus, 
  Sparkles, 
  Pencil, 
  Trash2, 
  Compass,
  Landmark,
  CreditCard,
  RefreshCw,
  Receipt,
  FileText,
  ShieldAlert,
  Home,
  Briefcase,
  Users,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoanValuation } from "@/components/fixed-income-valuation";

interface Liability {
  id: number;
  loanType: string;
  lenderName: string;
  totalLoanAmount: number;
  outstandingAmount: number;
  interestRate: number;
  emi: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  familyMemberId?: number | null;
}

interface LiabilityGroupViewProps {
  liabilities: Liability[] | undefined;
  selectedMemberId: number | null;
  onAddLiability: (type: string) => void;
  onEditLiability: (liability: Liability) => void;
  onDeleteLiability: (liabilityId: number) => void;
}

export const LIABILITY_TYPES = [
  { value: "Loans", label: "Loans" },
  { label: "Credit Cards & BNPL", value: "Credit Cards & BNPL" },
  { label: "EMIs", value: "EMIs" },
  { label: "Taxes", value: "Taxes" },
  { label: "Bills", value: "Bills" },
  { value: "Insurance Dues", label: "Insurance Dues" },
  { value: "Household Obligations", label: "Household Obligations" },
  { value: "Business Liabilities", label: "Business Liabilities" },
  { value: "Personal Borrowings", label: "Personal Borrowings" },
  { value: "Future Commitments", label: "Future Commitments" },
];

export const LOAN_LABELS: Record<string, string> = {
  home_loan: "Home Loan", 
  car_loan: "Car Loan", 
  personal_loan: "Personal Loan",
  education_loan: "Education Loan", 
  business_loan: "Business Loan", 
  other: "Other",
};

export const LIABILITY_GROUP_META: Record<string, { label: string; plural: string; gradient: string; badgeCls: string; color: string; icon: string }> = {
  "Loans":                 { label: "Loans",                 plural: "Loans",                 gradient: "from-rose-500 to-red-400",     badgeCls: "bg-rose-50 text-rose-700 border-rose-200",       color: "#f43f5e", icon: "🏦" },
  "Credit Cards & BNPL":   { label: "Credit Cards & BNPL",   plural: "Credit Cards & BNPL",   gradient: "from-pink-500 to-rose-400",    badgeCls: "bg-pink-50 text-pink-700 border-pink-200",       color: "#ec4899", icon: "💳" },
  "EMIs":                  { label: "EMIs",                  plural: "EMIs",                  gradient: "from-orange-500 to-amber-400",  badgeCls: "bg-orange-50 text-orange-700 border-orange-200", color: "#f97316", icon: "🔄" },
  "Taxes":                 { label: "Taxes",                 plural: "Taxes",                 gradient: "from-red-500 to-orange-400",    badgeCls: "bg-red-50 text-red-700 border-red-200",          color: "#ef4444", icon: "📝" },
  "Bills":                 { label: "Bills",                 plural: "Bills",                 gradient: "from-purple-500 to-pink-400",   badgeCls: "bg-purple-50 text-purple-700 border-purple-200", color: "#a855f7", icon: "💵" },
  "Insurance Dues":        { label: "Insurance Dues",        plural: "Insurance Dues",        gradient: "from-violet-500 to-purple-400", badgeCls: "bg-violet-50 text-violet-700 border-violet-200", color: "#8b5cf6", icon: "🛡️" },
  "Household Obligations": { label: "Household Obligations", plural: "Household Obligations", gradient: "from-slate-600 to-slate-500",   badgeCls: "bg-slate-100 text-slate-600 border-slate-200",   color: "#475569", icon: "🏠" },
  "Business Liabilities":  { label: "Business Liabilities",  plural: "Business Liabilities",  gradient: "from-amber-600 to-yellow-500",  badgeCls: "bg-amber-50 text-amber-800 border-amber-200",    color: "#d97706", icon: "💼" },
  "Personal Borrowings":   { label: "Personal Borrowings",   plural: "Personal Borrowings",   gradient: "from-teal-600 to-teal-400",     badgeCls: "bg-teal-50 text-teal-800 border-teal-200",       color: "#0d9488", icon: "👥" },
  "Future Commitments":    { label: "Future Commitments",    plural: "Future Commitments",    gradient: "from-blue-600 to-cyan-400",     badgeCls: "bg-blue-50 text-blue-800 border-blue-200",       color: "#2563eb", icon: "📅" }
};

export const LIABILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Loans": Landmark,
  "Credit Cards & BNPL": CreditCard,
  "EMIs": RefreshCw,
  "Taxes": Receipt,
  "Bills": FileText,
  "Insurance Dues": ShieldAlert,
  "Household Obligations": Home,
  "Business Liabilities": Briefcase,
  "Personal Borrowings": Users,
  "Future Commitments": Calendar,
};

export function LiabilityGroupView({
  liabilities,
  selectedMemberId,
  onAddLiability,
  onEditLiability,
  onDeleteLiability,
}: LiabilityGroupViewProps) {
  const filteredLiabilities = liabilities?.filter(
    (l) => (l.familyMemberId ?? null) === (selectedMemberId ?? null)
  ) ?? [];

  // Build groups similar to asset grouping
  const groups = LIABILITY_TYPES.map((t) => ({
    typeKey: t.value,
    meta: LIABILITY_GROUP_META[t.value] ?? {
      label: t.label,
      plural: t.label,
      gradient: "from-slate-400 to-slate-300",
      badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
      color: "#94a3b8",
      icon: "💼",
    },
    items: filteredLiabilities.filter((l) => (l.notes?.split("|")[0] || "Loans") === t.value),
  })).filter((g) => g.items.length > 0);

  const [activeLiabilityTab, setActiveLiabilityTab] = useState(0);
  const [isCircularNavOpen, setIsCircularNavOpen] = useState(false);

  if (groups.length === 0) {
    return (
      <Card className="border-slate-200 border-dashed bg-slate-50/50 rounded-2xl">
        <CardContent className="py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-500 font-semibold">No liabilities yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first liability to get started</p>
        </CardContent>
      </Card>
    );
  }

  const safeTab = Math.min(activeLiabilityTab, groups.length - 1);
  const activeGroup = groups[safeTab];

  const circularNavItems = groups.map((g, index) => ({
    name: g.meta.label,
    icon: LIABILITY_ICONS[g.typeKey] ?? Compass,
    href: "#",
    onClick: () => {
      setActiveLiabilityTab(index);
    },
  }));

  const totalOriginal = activeGroup.items.reduce((sum, l) => sum + l.totalLoanAmount, 0);
  const totalOutstanding = activeGroup.items.reduce((sum, l) => sum + l.outstandingAmount, 0);
  const remainingPct = totalOriginal > 0 ? (totalOutstanding / totalOriginal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Liability Navigation Trigger */}
      <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur-md border border-rose-500/25 p-4 rounded-2xl shadow-xl shadow-rose-500/5">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 text-rose-500">
            <Compass className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-rose-500/80 font-bold">Currently Viewing</p>
            <p className="text-sm font-extrabold text-slate-100">{activeGroup.meta.label}</p>
          </div>
        </div>
        <Button
          onClick={() => setIsCircularNavOpen(true)}
          className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border border-rose-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-rose-500/20"
        >
          <Compass className="w-4 h-4" /> Switch Liability Class
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
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500 animate-pulse" />
              {activeGroup.meta.label} Portfolio Summary
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Unified obligation metrics for all {activeGroup.items.length} active dynamic debt records
            </p>
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-50/50 border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Total Loan / Initial Amount</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {formatCurrency(totalOriginal)}
              </p>
            </Card>
            <Card className="bg-slate-50/50 border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Outstanding Amount</p>
              <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">
                {formatCurrency(totalOutstanding)}
              </p>
            </Card>
            <Card className="bg-slate-50/50 border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Remaining Ratio</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{remainingPct.toFixed(1)}%</p>
            </Card>
          </div>
        </CardContent>
      </Card>
      {/* Liability List for active group */}
      <div className="space-y-4">
        {activeGroup.items.map((liability) => (
          <div key={liability.id} className="p-4 md:p-5 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-all group shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="destructive" className="text-[9px] md:text-[10px] bg-rose-50 text-rose-600 border-rose-100 uppercase tracking-wider">
                    {(() => {
                      const parts = liability.notes?.split("|") ?? [];
                      const type = parts[0];
                      const subType = parts[parts.length - 1];
                      if (type === "Loans") return LOAN_LABELS[liability.loanType] ?? liability.loanType;
                      if (type === "Bills" && subType && subType !== "Bills") return `Bills - ${subType}`;
                      if (type === "Insurance Dues") {
                        const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1];
                        const sub = parts.find(p => p.startsWith("Sub:"))?.split(":")[1];
                        return sub ? `${cat} - ${sub}` : (cat ?? "Insurance");
                      }
                      return type || LOAN_LABELS[liability.loanType] || "Liability";
                    })()}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-slate-900 truncate">{liability.lenderName}</p>
                <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 hover:bg-slate-100/50 transition-all shadow-sm shadow-slate-100/5">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Total Liability</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{formatCurrency(liability.totalLoanAmount)}</p>
                  </div>
                  <div className="bg-rose-50/30 border border-rose-100/50 rounded-xl p-2.5 hover:bg-rose-50/50 transition-all shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-rose-500 mb-0.5">Outstanding</p>
                    <p className="text-xs font-bold text-rose-600 truncate">{formatCurrency(liability.outstandingAmount)}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 hover:bg-slate-100/50 transition-all shadow-sm shadow-slate-100/5">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Interest Rate</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{liability.interestRate}%</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 hover:bg-slate-100/50 transition-all shadow-sm shadow-slate-100/5">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Monthly EMI</p>
                    <p className="text-xs font-bold text-slate-900 truncate">{formatCurrency(liability.emi)}</p>
                  </div>
                </div>
                <LoanValuation liability={liability} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white"
                    onClick={() => onEditLiability(liability)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      if (confirm("Delete liability?")) onDeleteLiability(liability.id);
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
