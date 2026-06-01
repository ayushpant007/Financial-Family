import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  useGetClient, useGetClientSummary, useListClientAssets, useListClientLiabilities,
  useCreateClientAsset, useUpdateClientAsset, useDeleteClientAsset,
  useCreateClientLiability, useUpdateClientLiability, useDeleteClientLiability,
  useListFamilyMembers, useCreateFamilyMember, useUpdateFamilyMember, useDeleteFamilyMember,
  getGetClientSummaryQueryKey, getListClientAssetsQueryKey, getListClientLiabilitiesQueryKey,
  getListFamilyMembersQueryKey
} from "@workspace/api-client-react";
import { FamilyTree } from "@/components/family-tree";
import { useParams, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, IndianRupee, ArrowLeft, Sparkles, Compass, BarChart3, Landmark, RefreshCw, Shield, Coins, Loader2, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FundAutocomplete } from "@/components/fund-autocomplete";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { MutualFundNav, MFProjectionInline } from "@/components/mutual-fund-nav";
import { StockPriceDisplay, StockProjectionInline } from "@/components/stock-price-display";
import { FDValuation, RDValuation, PFValuation, calculatePFCurrentValue, calculateEMI, LoanValuation, calculateIncomeTax, SIPValuation, SWPValuation, STPValuation, calculateMFCurrentValue } from "@/components/fixed-income-valuation";
import { ScrollingFeatureShowcase } from "@/components/ui/interactive-scrolling-story-component";
import { usePageBackground } from "@/hooks/usePageBackground";
import { AnimatedTabBar } from "@/components/ui/animated-tab-bar";
import CircularNavigation from "@/components/ui/cicular-navigation-bar";
import { useMFNav } from "@/hooks/use-mf-nav";
import { useStockPrice } from "@/hooks/use-stock-price";
import { getFundCode } from "@/lib/mutual-funds";
import { getStockSymbol } from "@/lib/stocks";

function yearsElapsed(startDateStr: string, endDateStr?: string): number {
  const start = new Date(startDateStr);
  const cap = endDateStr ? new Date(endDateStr) : null;
  const effective = cap && new Date() > cap ? cap : new Date();
  const ms = effective.getTime() - start.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 365.25));
}

function monthsElapsed(startDateStr: string, maxMonths?: number): number {
  const start = new Date(startDateStr);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  const capped = maxMonths !== undefined ? Math.min(months, maxMonths) : months;
  return Math.max(0, capped);
}

const getAssetCurrentAndInvested = (asset: any) => {
  const data = asset.data as any;
  let invested = 0;
  let current = 0;

  if (asset.assetType === "mutual_fund") {
    const method = data.investmentMethod;
    if (!method || method === "Lump sum") {
      invested = parseFloat(data.amount || "0");
      current = asset.value || invested;
    } else if (method === "SIP") {
      const P = parseFloat(data.monthlyInvestment || "0") || 0;
      const start = data.startDate;
      const tenureYears = parseFloat(data.tenureYears || "1") || 1;
      const n_passed = start ? monthsElapsed(start, tenureYears * 12) : 0;
      invested = P * n_passed;
      current = calculateMFCurrentValue(data) || asset.value || invested;
    } else if (method === "SWP") {
      invested = parseFloat(data.investmentAmount || "0") || 0;
      current = calculateMFCurrentValue(data) || asset.value || invested;
    } else if (method === "STP") {
      invested = parseFloat(data.investmentAmount || "0") || 0;
      current = calculateMFCurrentValue(data) || asset.value || invested;
    }
  } else if (asset.assetType === "stock") {
    invested = parseFloat(data.amount || "0");
    current = asset.value || invested;
  } else if (asset.assetType === "fixed_deposit") {
    invested = parseFloat(data.investmentAmount || "0");
    const P = invested;
    const R = (parseFloat(data.interestRate || "0")) / 100;
    const T = yearsElapsed(data.startDate || "", data.maturityDate || undefined);
    const payoutType = data.payoutType ?? "Cumulative";
    let n_freq = 1;
    if (payoutType === "Monthly") n_freq = 12;
    else if (payoutType === "Quarterly") n_freq = 4;
    current = P * Math.pow(1 + R / n_freq, n_freq * T);
  } else if (asset.assetType === "recurring_deposit") {
    const monthly = parseFloat(data.monthlyInvestment || "0");
    let tenureMonths = 0;
    if (data.startDate && data.maturityDate) {
      const d1 = new Date(data.startDate);
      const d2 = new Date(data.maturityDate);
      tenureMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    } else {
      tenureMonths = parseFloat(data.tenure || "0");
    }
    const n_months_passed = data.startDate ? monthsElapsed(data.startDate, tenureMonths || undefined) : tenureMonths;
    const n_installments = Math.min(n_months_passed + 1, tenureMonths);
    invested = monthly * n_installments;
    
    const i_q = (parseFloat(data.interestRate || "0")) / 400;
    const i_eff = Math.pow(1 + i_q, 1/3) - 1;
    const accruedOnPassed = n_months_passed > 0 ? monthly * (Math.pow(1 + i_eff, n_months_passed) - 1) / i_eff * (1 + i_eff) : 0;
    const currentInstallment = (n_installments > n_months_passed) ? monthly : 0;
    current = accruedOnPassed + currentInstallment;
  } else if (asset.assetType === "provident_fund") {
    const pf = calculatePFCurrentValue(data);
    invested = pf.totalInvested;
    current = pf.currentValue;
  } else if (asset.assetType === "cash_bank") {
    invested = parseFloat(data.amount || "0");
    current = asset.value || invested;
  } else {
    invested = asset.value || 0;
    current = asset.value || 0;
  }

  return { invested, current };
};

const CLIENT_DETAIL_SLIDES = [
  {
    title: "Complete Family Financial Map",
    description: "Every asset, every liability, every family member — all in one unified view. Real-time valuations, auto-calculated EMIs, and live market prices.",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Asset Allocation Breakdown",
    description: "Instantly see how wealth is distributed across mutual funds, stocks, fixed deposits, provident funds, and cash — with live NAV and NSE pricing.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Liability Intelligence",
    description: "Track every loan, EMI, tax due, insurance premium, and household obligation with precise outstanding amounts and repayment timelines.",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Generational Family Tree",
    description: "Visualise the full family structure and drill into any member's personal assets and liabilities for a truly multi-generational view.",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

const ASSET_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  stock: "Stock",
  fixed_deposit: "Fixed Deposit",
  recurring_deposit: "Recurring Deposit",
  provident_fund: "Provident Fund",
  cash_bank: "Cash & Bank",
};

const ASSET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mutual_fund: TrendingUp,
  stock: BarChart3,
  fixed_deposit: Landmark,
  recurring_deposit: RefreshCw,
  provident_fund: Shield,
  cash_bank: Coins,
};

const LOAN_LABELS: Record<string, string> = {
  home_loan: "Home Loan", car_loan: "Car Loan", personal_loan: "Personal Loan",
  education_loan: "Education Loan", business_loan: "Business Loan", other: "Other",
};

const CHART_COLORS = ["#C9A84C", "#334155", "#64748B", "#94A3B8", "#CBD5E1"];

const ASSET_TYPES = [
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "stock", label: "Stock" },
  { value: "fixed_deposit", label: "Fixed Deposit (FD)" },
  { value: "recurring_deposit", label: "Recurring Deposit (RD)" },
  { value: "provident_fund", label: "Provident Fund (PPF/EPF)" },
  { value: "cash_bank", label: "Cash / Bank Balance" },
];

const LOAN_TYPES = [
  { value: "home_loan", label: "Home Loan" }, { value: "car_loan", label: "Car Loan" },
  { value: "personal_loan", label: "Personal Loan" }, { value: "education_loan", label: "Education Loan" },
  { value: "business_loan", label: "Business Loan" }, { value: "other", label: "Other" },
];

const LIABILITY_TYPES = [
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

const BILL_CATEGORIES = [
  { label: "Electricity bill", value: "Electricity bill" },
  { label: "Water bill", value: "Water bill" },
  { label: "Internet bill", value: "Internet bill" },
];

const INSURANCE_CATEGORIES = [
  { label: "Life Insurance", value: "Life Insurance" },
  { label: "Health Insurance", value: "Health Insurance" },
  { label: "Vehicle Insurance", value: "Vehicle Insurance" },
  { label: "Home Insurance", value: "Home Insurance" },
  { label: "Travel Insurance", value: "Travel Insurance" },
];

const LIFE_INSURANCE_SUBTYPES = [
  { label: "Term Insurance", value: "Term Insurance" },
  { label: "ULIP / Investment-linked", value: "ULIP" },
];

const VEHICLE_INSURANCE_SUBTYPES = [
  { label: "Car", value: "Car" },
  { label: "Bike", value: "Bike" },
  { label: "Scooty", value: "Scooty" },
];



const BUSINESS_LOAN_TYPES = [
  { value: "Term Loan", label: "Term Loan" },
  { value: "Working Capital/ OD", label: "Working Capital/ OD" },
  { value: "Bullet Loan", label: "Bullet Loan" },
];

const HOUSEHOLD_CATEGORIES = [
  { value: "Housing", label: "Housing (Rent, Maint, Taxes)" },
  { value: "Utilities", label: "Utilities (Elec, Water, Gas, Net)" },
  { value: "Groceries", label: "Groceries & Daily Needs" },
  { value: "Education", label: "Education (Fees, Books)" },
  { value: "Domestic Services", label: "Domestic Services (Maid, Cook)" },
  { value: "Healthcare", label: "Healthcare & Misc" },
];



type AssetDialogData = {
  type: string;
  data: Record<string, string>;
  editId?: number;
};

type LiabilityDialogData = {
  liabilityType: string; loanType: string; lenderName: string; totalLoanAmount: string; outstandingAmount: string;
  interestRate: string; emi: string; startDate: string; endDate: string; interestType: string; subType: string; tenure: string;
  income: string; tds: string; advanceTax: string; standardDeduction: string; editId?: number;
  insuranceCategory: string; insuranceSubtype: string; propertyValue: string; insuranceRate: string; premium: string;
  tenureYears: string; baseRate: string; addOns: string; discounts: string;
  householdCategory: string; householdAmount: string;
  rent: string; maintenance: string; taxes: string;
  electricity: string; water: string; gas: string; internet: string;
  groceries: string;
  fees: string; books: string; academicCosts: string;
  maidSalary: string; cookSalary: string; serviceCosts: string;
  medicalBills: string; medicines: string; miscCosts: string;
};

interface AssetDistributionCardProps {
  item: any;
  totals: { current: number; invested: number };
  onResolved: (assetId: number, current: number, invested: number) => void;
  activeGroup: any;
}

function AssetDistributionCard({
  item,
  totals,
  onResolved,
  activeGroup
}: AssetDistributionCardProps) {
  const assetName = (item.data as any).assetName || (item.data as any).institutionName || activeGroup.meta.label;
  const investmentMethod = (item.data as any).investmentMethod;
  const units = parseFloat((item.data as any).units ?? "0");
  
  // Calculate static values first
  const staticVals = getAssetCurrentAndInvested(item);
  const [resolvedVals, setResolvedVals] = useState(staticVals);

  // If mutual fund & lump sum
  const isMFLumpSum = item.assetType === "mutual_fund" && (!investmentMethod || investmentMethod === "Lump sum");
  const mfSchemeCode = isMFLumpSum && assetName ? getFundCode(assetName) : null;
  const { data: mfData } = useMFNav(mfSchemeCode ?? "");

  // If stock
  const isStock = item.assetType === "stock";
  const stockSymbol = isStock && assetName ? getStockSymbol(assetName) : null;
  const { data: stockData } = useStockPrice(stockSymbol ?? "");

  // Effect to update local and parent values for Mutual Fund
  useEffect(() => {
    if (isMFLumpSum && mfData?.nav !== undefined) {
      const current = units * mfData.nav;
      setResolvedVals({ invested: staticVals.invested, current });
      onResolved(item.id, current, staticVals.invested);
    }
  }, [mfData?.nav, isMFLumpSum, units, staticVals.invested, item.id, onResolved]);

  // Effect to update local and parent values for Stock
  useEffect(() => {
    if (isStock && stockData?.price !== undefined) {
      const current = units * stockData.price;
      setResolvedVals({ invested: staticVals.invested, current });
      onResolved(item.id, current, staticVals.invested);
    }
  }, [stockData?.price, isStock, units, staticVals.invested, item.id, onResolved]);

  // For other asset types (or while loading), use static/fallback values
  const vals = resolvedVals;
  const weight = totals.current > 0 ? (vals.current / totals.current) * 100 : 0;
  const gain = vals.current - vals.invested;
  const gainPct = vals.invested > 0 ? (gain / vals.invested) * 100 : 0;
  const isPositive = gain >= 0;

  // Build projection trigger node
  let projectionNode: React.ReactNode = null;
  if (item.assetType === "mutual_fund" && assetName) {
    projectionNode = (
      <MFProjectionInline
        fundName={assetName}
        units={parseFloat((item.data as any).units ?? "0")}
        investmentAmount={vals.invested}
        investmentMethod={investmentMethod}
        assetData={item.data}
      />
    );
  } else if (item.assetType === "fixed_deposit") {
    projectionNode = (
      <Dialog>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 w-full justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm group">
            <BarChart3 className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            View Full Projection
            <span className="ml-auto text-slate-300 group-hover:text-slate-500">→</span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="text-slate-900">FD Growth Projection</DialogTitle></DialogHeader>
          <div className="py-2"><FDValuation data={item.data as Record<string, unknown>} /></div>
        </DialogContent>
      </Dialog>
    );
  } else if (item.assetType === "recurring_deposit") {
    projectionNode = (
      <Dialog>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 w-full justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm group">
            <BarChart3 className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            View Full Projection
            <span className="ml-auto text-slate-300 group-hover:text-slate-500">→</span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="text-slate-900">RD Growth Projection</DialogTitle></DialogHeader>
          <div className="py-2"><RDValuation data={item.data as Record<string, unknown>} /></div>
        </DialogContent>
      </Dialog>
    );
  } else if (item.assetType === "provident_fund") {
    projectionNode = (
      <Dialog>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 w-full justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm group">
            <BarChart3 className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            View Full Projection
            <span className="ml-auto text-slate-300 group-hover:text-slate-500">→</span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="text-slate-900">PF Growth Projection</DialogTitle></DialogHeader>
          <div className="py-2"><PFValuation data={item.data as Record<string, unknown>} /></div>
        </DialogContent>
      </Dialog>
    );
  } else if (item.assetType === "stock" && assetName) {
    projectionNode = (
      <StockProjectionInline
        stockName={assetName}
        units={parseFloat((item.data as any).units ?? "0")}
        investmentAmount={vals.invested}
      />
    );
  }

  return (
    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fadeIn">
      {/* Card Header — Fund name + type badge */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-snug truncate" title={assetName}>{assetName}</p>
          {investmentMethod && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {investmentMethod}
            </span>
          )}
        </div>
        {/* Return badge */}
        <div className={`flex-shrink-0 text-right rounded-xl px-3 py-1.5 ${isPositive ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Total Return</p>
          <p className={`text-sm font-black tabular-nums ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isPositive ? '+' : ''}{gainPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Amount Invested</p>
          <p className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(vals.invested)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Current Market Value</p>
          <p className="text-sm font-black text-slate-800 tabular-nums flex items-center gap-1.5">
            {vals.current === staticVals.current && (isMFLumpSum || isStock) ? (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                {formatCurrency(vals.current)}
              </span>
            ) : formatCurrency(vals.current)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Portfolio Share</p>
          <p className="text-sm font-black text-slate-800 tabular-nums">{weight.toFixed(1)}%</p>
        </div>
      </div>

      {/* Weight bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-slate-400 font-semibold">Portfolio Allocation</p>
          <p className="text-[10px] text-slate-500 font-bold">{weight.toFixed(1)}% of total</p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
          <div
            className={`bg-gradient-to-r ${activeGroup.meta.gradient} h-full rounded-full transition-all duration-700`}
            style={{ width: `${weight}%` }}
          />
        </div>
      </div>

      {/* Projection button — full-width, clearly separated */}
      {projectionNode && (
        <div className="px-4 pb-4 pt-3">
          {projectionNode}
        </div>
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = parseInt(params.clientId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: client, isLoading, isError } = useGetClient(clientId, { query: { enabled: !!clientId, queryKey: ["client", clientId] } as any });
  const { data: summary } = useGetClientSummary(clientId, { query: { enabled: !!clientId, queryKey: getGetClientSummaryQueryKey(clientId) } as any });
  const { data: assets } = useListClientAssets(clientId, { query: { enabled: !!clientId, queryKey: getListClientAssetsQueryKey(clientId) } as any });
  const { data: liabilities } = useListClientLiabilities(clientId, { query: { enabled: !!clientId, queryKey: getListClientLiabilitiesQueryKey(clientId) } as any });

  usePageBackground('light');

  const createAsset = useCreateClientAsset();
  const updateAsset = useUpdateClientAsset();
  const deleteAsset = useDeleteClientAsset();
  const createLiability = useCreateClientLiability();
  const updateLiability = useUpdateClientLiability();
  const deleteLiability = useDeleteClientLiability();

  const { data: familyMembers } = useListFamilyMembers(clientId, { query: { enabled: !!clientId, queryKey: getListFamilyMembersQueryKey(clientId) } as any });
  const createFamilyMember = useCreateFamilyMember();
  const updateFamilyMember = useUpdateFamilyMember();
  const deleteFamilyMember = useDeleteFamilyMember();

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null); // null means primary client
  const [familyMemberDialog, setFamilyMemberDialog] = useState<{ name: string; dob: string; phone: string; relation: "Parent" | "Spouse" | "Child"; editId?: number } | null>(null);

  const [assetDialog, setAssetDialog] = useState<AssetDialogData | null>(null);
  const [liabilityDialog, setLiabilityDialog] = useState<LiabilityDialogData | null>(null);
  const [activeAssetTab, setActiveAssetTab] = useState(0);
  const [isCircularNavOpen, setIsCircularNavOpen] = useState(false);
  const [viewHoldingsForType, setViewHoldingsForType] = useState<string | null>(null);
  const [assetCurrentPage, setAssetCurrentPage] = useState(1);
  const [liveValues, setLiveValues] = useState<Record<number, { current: number; invested: number }>>({});
  const [activeMainTab, setActiveMainTab] = useState<"assets" | "liabilities">("assets");
  const [mainAssetsPage, setMainAssetsPage] = useState(1);
  const [mainLiabilitiesPage, setMainLiabilitiesPage] = useState(1);

  useEffect(() => {
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === "assets" || customEvent.detail === "liabilities") {
        setActiveMainTab(customEvent.detail);
      }
    };
    window.addEventListener("switch-tab", handleSwitchTab);
    return () => window.removeEventListener("switch-tab", handleSwitchTab);
  }, []);

  const handleLiveValueResolved = useCallback((assetId: number, current: number, invested: number) => {
    setLiveValues(prev => {
      if (prev[assetId]?.current === current && prev[assetId]?.invested === invested) {
        return prev;
      }
      return {
        ...prev,
        [assetId]: { current, invested }
      };
    });
  }, []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetClientSummaryQueryKey(clientId) });
    queryClient.invalidateQueries({ queryKey: getListClientAssetsQueryKey(clientId) });
    queryClient.invalidateQueries({ queryKey: getListClientLiabilitiesQueryKey(clientId) });
  };

  const handleSaveAsset = async () => {
    if (!assetDialog) return;
    try {
      if (assetDialog.editId) {
        await updateAsset.mutateAsync({ clientId, assetId: assetDialog.editId, data: { data: assetDialog.data, familyMemberId: selectedMemberId } });
      } else {
        await createAsset.mutateAsync({ clientId, data: { assetType: assetDialog.type as any, data: assetDialog.data, familyMemberId: selectedMemberId } });
      }
      setAssetDialog(null);
      invalidate();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save asset: ${err.message || JSON.stringify(err)}`);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!window.confirm("Delete this asset?")) return;
    await deleteAsset.mutateAsync({ clientId, assetId });
    invalidate();
  };

  const handleSaveLiability = async () => {
    if (!liabilityDialog) return;
    const payload: any = {
      loanType: liabilityDialog.loanType as any,
      lenderName: liabilityDialog.lenderName,
      totalLoanAmount: parseFloat(liabilityDialog.totalLoanAmount || "0"),
      outstandingAmount: parseFloat(liabilityDialog.outstandingAmount || "0"),
      interestRate: parseFloat(liabilityDialog.interestRate || "0"),
      emi: parseFloat(liabilityDialog.emi || "0"),
      startDate: liabilityDialog.startDate || undefined,
      endDate: liabilityDialog.endDate || undefined,
      familyMemberId: selectedMemberId,
      notes: liabilityDialog.liabilityType === "Taxes" 
        ? `Taxes|Income:${liabilityDialog.income}|TDS:${liabilityDialog.tds}|Advance:${liabilityDialog.advanceTax}|StdDed:${liabilityDialog.standardDeduction}`
        : liabilityDialog.liabilityType === "Bills"
        ? `Bills|${liabilityDialog.subType}`
        : liabilityDialog.liabilityType === "Insurance Dues"
        ? `Insurance Dues|Cat:${liabilityDialog.insuranceCategory}${(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Vehicle Insurance") && liabilityDialog.insuranceSubtype ? `|Sub:${liabilityDialog.insuranceSubtype}` : ""}|Premium:${liabilityDialog.premium}|Years:${liabilityDialog.tenureYears}|Base:${liabilityDialog.baseRate}|Addons:${liabilityDialog.addOns}|Disc:${liabilityDialog.discounts}`
        : liabilityDialog.liabilityType === "Household Obligations"
        ? `Household Obligations|Cat:${liabilityDialog.householdCategory}|Amt:${liabilityDialog.householdAmount}${
            liabilityDialog.householdCategory === "Housing" ? `|Rent:${liabilityDialog.rent}|Maint:${liabilityDialog.maintenance}|Taxes:${liabilityDialog.taxes}` :
            liabilityDialog.householdCategory === "Utilities" ? `|Elec:${liabilityDialog.electricity}|Water:${liabilityDialog.water}|Gas:${liabilityDialog.gas}|Net:${liabilityDialog.internet}` :
            liabilityDialog.householdCategory === "Education" ? `|Fees:${liabilityDialog.fees}|Books:${liabilityDialog.books}|Acad:${liabilityDialog.academicCosts}` :
            liabilityDialog.householdCategory === "Domestic Services" ? `|Maid:${liabilityDialog.maidSalary}|Cook:${liabilityDialog.cookSalary}|Serv:${liabilityDialog.serviceCosts}` :
            liabilityDialog.householdCategory === "Healthcare" ? `|MedB:${liabilityDialog.medicalBills}|MedI:${liabilityDialog.medicines}|Misc:${liabilityDialog.miscCosts}` :
            ""
          }`
        : `${liabilityDialog.liabilityType}${liabilityDialog.interestType === "Flat" ? "|Flat" : ""}${liabilityDialog.subType ? `|${liabilityDialog.subType}` : ""}`,
    };
    if (liabilityDialog.editId) {
      await updateLiability.mutateAsync({ clientId, liabilityId: liabilityDialog.editId, data: payload });
    } else {
      await createLiability.mutateAsync({ clientId, data: payload });
    }
    setLiabilityDialog(null);
    invalidate();
  };

  const handleDeleteLiability = async (liabilityId: number) => {
    if (!window.confirm("Delete this liability?")) return;
    await deleteLiability.mutateAsync({ clientId, liabilityId });
    invalidate();
  };

  const updateLiabilityField = (key: string, value: string) => {
    if (!liabilityDialog) return;
    const newData = { ...liabilityDialog, [key]: value };
    
    if ((newData.liabilityType === "Loans" || newData.liabilityType === "Credit Cards & BNPL" || newData.liabilityType === "EMIs") && (key === "totalLoanAmount" || key === "interestRate" || key === "startDate" || key === "endDate" || key === "interestType" || key === "subType" || key === "tenure")) {
      // Sync Tenure and End Date
      if (key === "tenure" && newData.startDate && newData.tenure) {
        const start = new Date(newData.startDate);
        const years = parseFloat(newData.tenure) || 0;
        const end = new Date(start);
        end.setFullYear(start.getFullYear() + Math.floor(years));
        end.setMonth(start.getMonth() + Math.round((years % 1) * 12));
        newData.endDate = end.toISOString().split("T")[0];
      } else if ((key === "startDate" || key === "endDate") && newData.startDate && newData.endDate) {
        const start = new Date(newData.startDate);
        const end = new Date(newData.endDate);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        newData.tenure = (months / 12).toFixed(1);
      }

      const P = (newData.subType === "Working Capital/ OD") 
        ? (parseFloat(newData.outstandingAmount) || parseFloat(newData.totalLoanAmount) || 0)
        : (parseFloat(newData.totalLoanAmount) || 0);
      
      const R = parseFloat(newData.interestRate) || 0;
      if (P > 0 && R > 0) {
        if (newData.subType === "Working Capital/ OD" || newData.subType === "Bullet Loan") {
          newData.emi = calculateEMI(P, R, 1, false, newData.subType).toFixed(2);
        } else if (newData.startDate && newData.endDate) {
          const start = new Date(newData.startDate);
          const end = new Date(newData.endDate);
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          if (months > 0) {
            newData.emi = calculateEMI(P, R, months, newData.interestType === "Flat", newData.subType).toFixed(2);
          }
        }
      }
    } else if (newData.liabilityType === "Taxes") {
      const inc = parseFloat(newData.income) || 0;
      const t = parseFloat(newData.tds) || 0;
      const adv = parseFloat(newData.advanceTax) || 0;
      const std = parseFloat(newData.standardDeduction) || 75000;
      if (inc > 0) {
        const grossTaxPlusCess = calculateIncomeTax(inc, std);
        const netTax = Math.max(0, grossTaxPlusCess - t - adv);
        newData.totalLoanAmount = netTax.toFixed(2);
        newData.outstandingAmount = netTax.toFixed(2);
      }
    } else if (newData.liabilityType === "Bills") {
      const P = parseFloat(newData.totalLoanAmount) || 0;
      const r = (parseFloat(newData.interestRate) || 0) / 100;
      if (P > 0 && newData.startDate) {
        const due = new Date(newData.startDate);
        const now = new Date();
        if (now > due) {
          // Calculate months overdue (t)
          const t = (now.getFullYear() - due.getFullYear()) * 12 + (now.getMonth() - due.getMonth());
          if (t > 0) {
            // A = P(1 + r)^t
            const A = P * Math.pow(1 + r, t);
            newData.outstandingAmount = A.toFixed(2);
          } else {
            newData.outstandingAmount = P.toFixed(2);
          }
        } else {
          newData.outstandingAmount = P.toFixed(2);
        }
      }
    } else if (newData.liabilityType === "Insurance Dues") {
      const cat = newData.insuranceCategory;
      const sub = newData.insuranceSubtype;
      
      if (cat === "Vehicle Insurance" && (key === "baseRate" || key === "addOns" || key === "discounts")) {
        const base = parseFloat(key === "baseRate" ? value : newData.baseRate) || 0;
        const add = parseFloat(key === "addOns" ? value : newData.addOns) || 0;
        const disc = parseFloat(key === "discounts" ? value : newData.discounts) || 0;
        newData.premium = (base + add - disc).toFixed(2);
      }

      const prem = parseFloat(newData.premium) || 0;
      const yrs = parseFloat(newData.tenureYears) || 0;
      const rate = (parseFloat(newData.interestRate) || 0) / 100;
      const propVal = parseFloat(newData.propertyValue) || 0;

      if (cat === "Life Insurance") {
        if (sub === "Term Insurance") {
          newData.totalLoanAmount = (prem * yrs).toFixed(2);
        } else if (sub === "ULIP") {
          newData.totalLoanAmount = (prem * Math.pow(1 + rate, yrs)).toFixed(2);
        }
      } else if (cat === "Health Insurance") {
        newData.totalLoanAmount = (prem * yrs).toFixed(2);
      } else if (cat === "Vehicle Insurance" || cat === "Travel Insurance") {
        newData.totalLoanAmount = prem.toFixed(2);
      } else if (cat === "Home Insurance") {
        newData.totalLoanAmount = (propVal * rate).toFixed(2);
      }
      newData.outstandingAmount = newData.totalLoanAmount;
    } else if (newData.liabilityType === "Household Obligations") {
      let total = 0;
      if (newData.householdCategory === "Housing") {
        total = (parseFloat(newData.rent) || 0) + (parseFloat(newData.maintenance) || 0) + (parseFloat(newData.taxes) || 0);
      } else if (newData.householdCategory === "Utilities") {
        total = (parseFloat(newData.electricity) || 0) + (parseFloat(newData.water) || 0) + (parseFloat(newData.gas) || 0) + (parseFloat(newData.internet) || 0);
      } else if (newData.householdCategory === "Groceries") {
        total = parseFloat(newData.groceries) || 0;
      } else if (newData.householdCategory === "Education") {
        total = (parseFloat(newData.fees) || 0) + (parseFloat(newData.books) || 0) + (parseFloat(newData.academicCosts) || 0);
      } else if (newData.householdCategory === "Domestic Services") {
        total = (parseFloat(newData.maidSalary) || 0) + (parseFloat(newData.cookSalary) || 0) + (parseFloat(newData.serviceCosts) || 0);
      } else if (newData.householdCategory === "Healthcare") {
        total = (parseFloat(newData.medicalBills) || 0) + (parseFloat(newData.medicines) || 0) + (parseFloat(newData.miscCosts) || 0);
      } else {
        total = parseFloat(newData.householdAmount) || 0;
      }
      
      newData.householdAmount = total.toFixed(2);
      newData.totalLoanAmount = total.toFixed(2);
      newData.outstandingAmount = total.toFixed(2);
    }
    setLiabilityDialog(newData);
  };

  const chartData = summary?.assetBreakdown.map((item) => ({
    name: ASSET_LABELS[item.assetType] || item.assetType,
    value: item.total,
  })) ?? [];

  const updateAssetField = (key: string, value: string) => {
    if (!assetDialog) return;
    const data = { ...assetDialog.data, [key]: value };
    if (key === "units" || key === "price") {
      const units = parseFloat((key === "units" ? value : data.units) || "0");
      const price = parseFloat((key === "price" ? value : data.price) || "0");
      data.amount = (units * price).toFixed(2);
    }
    
    // Auto-calculate tenureYears based on Age (Retirement at 60)
    if (key === "age" && assetDialog.type === "provident_fund" && data.accountType === "EPF") {
      const age = parseInt(value) || 0;
      if (age > 0 && age < 60) {
        data.tenureYears = String(60 - age);
      }
    }
    
    setAssetDialog({ ...assetDialog, data });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Loading client details...</p>
        </div>
      </Layout>
    );
  }

  if (isError || !client) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/clients">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Client Not Found</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">The client you are looking for does not exist or has been deleted.</p>
              <Link href="/admin/clients">
                <Button className="mt-4">Back to Clients</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const filteredAssets = assets?.filter(a => (a.familyMemberId ?? null) === (selectedMemberId ?? null)) ?? [];

  const GROUP_META: Record<string, { label: string; plural: string; gradient: string; badgeCls: string; color: string; icon: string }> = {
    mutual_fund:       { label: "Mutual Fund",        plural: "Mutual Funds",       gradient: "from-amber-400 to-yellow-300",  badgeCls: "bg-amber-50 text-amber-700 border-amber-200",    color: "#f59e0b", icon: "📈" },
    stock:             { label: "Stock",              plural: "Stocks",             gradient: "from-emerald-500 to-teal-400",  badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "#10b981", icon: "📊" },
    fixed_deposit:     { label: "Fixed Deposit",     plural: "Fixed Deposits",     gradient: "from-blue-500 to-indigo-400",   badgeCls: "bg-blue-50 text-blue-700 border-blue-200",       color: "#3b82f6", icon: "🏦" },
    recurring_deposit: { label: "Recurring Deposit", plural: "Recurring Deposits", gradient: "from-violet-500 to-purple-400", badgeCls: "bg-violet-50 text-violet-700 border-violet-200", color: "#8b5cf6", icon: "🔄" },
    provident_fund:    { label: "PF / PPF",          plural: "Provident Fund",     gradient: "from-orange-500 to-rose-400",   badgeCls: "bg-orange-50 text-orange-700 border-orange-200", color: "#f97316", icon: "🛡️" },
    cash_bank:         { label: "Cash & Bank",       plural: "Cash & Bank",        gradient: "from-slate-500 to-slate-400",   badgeCls: "bg-slate-100 text-slate-600 border-slate-200",   color: "#64748b", icon: "💵" },
  };

  const groups = ASSET_TYPES
    .map(t => ({
      typeKey: t.value,
      meta: GROUP_META[t.value] ?? { label: t.label, plural: t.label, gradient: "from-slate-400 to-slate-300", badgeCls: "bg-slate-100 text-slate-600 border-slate-200", color: "#94a3b8", icon: "💼" },
      items: filteredAssets.filter(a => a.assetType === t.value),
    }))
    .filter(g => g.items.length > 0);

  if (viewHoldingsForType !== null) {
    const activeGroup = groups.find(g => g.typeKey === viewHoldingsForType);
    if (!activeGroup) {
      setViewHoldingsForType(null);
      return null;
    }

    const sortedHoldings = [...activeGroup.items].sort((a, b) => b.id - a.id);
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(sortedHoldings.length / itemsPerPage));
    const activePage = Math.min(assetCurrentPage, totalPages);
    const startIndex = (activePage - 1) * itemsPerPage;
    const paginatedHoldings = sortedHoldings.slice(startIndex, startIndex + itemsPerPage);

    const skipKeys = ["amount","basicSalary","dearnessAllowance","employeeContributionPercent","employerContributionPercent","interestRate","tenureYears","currentBalance","salaryGrowth","includeEPS","totalContribution","startDate","maturityDate","monthlyInvestment","investmentAmount","institutionName","payoutType","assetName","investmentMethod"];
    
    const labelMap: Record<string, string> = {
      date: "Purchase Date", price: "Buy Price", units: "Units",
      accountType: "Account", age: "Age",
    };

    const formatValue = (k: string, v: unknown) => {
      const str = String(v);
      if (k === "price" || k === "amount") return formatCurrency(parseFloat(str) || 0);
      return str;
    };

    return (
      <Layout>
        <div className="space-y-6 pb-20 md:pb-0" data-reveal>
          {/* Header row with navigation & back button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-900 cursor-pointer flex items-center justify-center transition-all"
                onClick={() => setViewHoldingsForType(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Client Profile</span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] uppercase tracking-widest text-amber-500 font-extrabold">{client?.name}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Detailed {activeGroup.meta.plural}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${activeGroup.meta.badgeCls}`}>
                    {sortedHoldings.length} holding{sortedHoldings.length !== 1 ? "s" : ""}
                  </span>
                </h1>
              </div>
            </div>

            <Button 
              onClick={() => setViewHoldingsForType(null)}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Client Profile
            </Button>
          </div>

          {/* Asset Summary Banner */}
          <div className={`p-6 rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-900/95 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6`}>
            <div className="flex items-center gap-4.5">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${activeGroup.meta.gradient} flex items-center justify-center text-2xl shadow-lg shadow-amber-500/10 flex-shrink-0`}>
                {activeGroup.meta.icon}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Total Asset Value</p>
                <h2 className="text-3xl font-black tracking-tight mt-1.5 tabular-nums">
                  {formatCurrency(activeGroup.items.reduce((s, a) => s + (a.value ?? 0), 0))}
                </h2>
              </div>
            </div>

            {(!isAdmin || selectedMemberId === null) && (
              <Button 
                onClick={() => { setAssetDialog({ type: activeGroup.typeKey, data: {} }); }}
                className={`bg-gradient-to-r ${activeGroup.meta.gradient} hover:opacity-90 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer`}
              >
                <Plus className="h-4 w-4" /> Add New Holding
              </Button>
            )}
          </div>

          {/* Stretched holdings list stacked vertically (Row-by-Row) */}
          <div className="flex flex-col gap-5">
            {paginatedHoldings.length === 0 ? (
              <Card className="border-slate-200 border-dashed bg-slate-50/50 rounded-2xl">
                <CardContent className="py-16 text-center text-slate-400 text-sm">
                  No holdings found in this asset class.
                </CardContent>
              </Card>
            ) : (
              paginatedHoldings.map((asset) => (
                <Card key={asset.id} className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 rounded-3xl group">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${activeGroup.meta.gradient}`} />
                  <CardContent className="p-6">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex-1 min-w-0">
                        {(asset.data as any).assetName && (
                          <h4 className="text-base font-black text-slate-900 leading-snug mb-1.5 pr-2">
                            {(asset.data as any).assetName}
                          </h4>
                        )}
                        {(asset.data as any).investmentMethod && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${activeGroup.meta.badgeCls} mb-3`}>
                            {(asset.data as any).investmentMethod}
                          </span>
                        )}
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Current Value:</span>
                          <span className="text-2xl font-black text-slate-955 tabular-nums">
                            {asset.assetType === "provident_fund"
                              ? formatCurrency(calculatePFCurrentValue(asset.data as Record<string, any>).currentValue)
                              : (asset.data as any).investmentMethod && (asset.data as any).investmentMethod !== "Lump sum"
                              ? formatCurrency(calculateMFCurrentValue(asset.data))
                              : formatCurrency(asset.value)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer" 
                          onClick={() => {
                            const data: Record<string, string> = {};
                            Object.entries(asset.data as Record<string, unknown>).forEach(([k, v]) => { data[k] = String(v); });
                            setAssetDialog({ type: asset.assetType, data, editId: asset.id });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer" 
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Metric Chips Grid */}
                    {(() => {
                      const entries = Object.entries(asset.data as Record<string, unknown>).filter(([k]) => !skipKeys.includes(k));
                      if (entries.length === 0) return null;
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {entries.map(([k, v]) => (
                            <div key={k} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 hover:bg-slate-100/70 transition-all shadow-sm shadow-slate-100/5">
                              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">
                                {labelMap[k] ?? k.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                              <p className="text-sm font-bold text-slate-800 truncate" title={String(v)}>
                                {formatValue(k, v)}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Live Valuation details if supported */}
                    {(asset.assetType === "mutual_fund" || asset.assetType === "stock" || asset.assetType === "fixed_deposit" || asset.assetType === "recurring_deposit" || asset.assetType === "provident_fund") && (
                      <div className="border-t border-dashed border-slate-200 pt-4 mt-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Valuation Feed
                        </p>
                        {asset.assetType === "mutual_fund" && (asset.data as any).assetName && (
                          <>
                            {!(asset.data as any).investmentMethod || (asset.data as any).investmentMethod === "Lump sum" ? (
                              <MutualFundNav fundName={(asset.data as any).assetName} units={parseFloat((asset.data as any).units ?? "0")} investmentAmount={parseFloat((asset.data as any).amount ?? "0")} />
                            ) : (asset.data as any).investmentMethod === "SIP" ? (
                              <SIPValuation data={asset.data} />
                            ) : (asset.data as any).investmentMethod === "SWP" ? (
                              <SWPValuation data={asset.data} />
                            ) : (asset.data as any).investmentMethod === "STP" ? (
                              <STPValuation data={asset.data} />
                            ) : null}
                          </>
                        )}
                        {asset.assetType === "stock" && (asset.data as any).assetName && (
                          <StockPriceDisplay stockName={(asset.data as any).assetName} units={parseFloat((asset.data as any).units ?? "0")} investmentAmount={parseFloat((asset.data as any).amount ?? "0")} />
                        )}
                        {asset.assetType === "fixed_deposit" && <FDValuation data={asset.data as Record<string, unknown>} />}
                        {asset.assetType === "recurring_deposit" && <RDValuation data={asset.data as Record<string, unknown>} />}
                        {asset.assetType === "provident_fund" && <PFValuation data={asset.data as Record<string, unknown>} />}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Always Visible Pagination Footer */}
          {sortedHoldings.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/80 pt-6 mt-8">
              <p className="text-xs font-semibold text-slate-500">
                Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
                <span className="font-extrabold text-slate-950">{Math.min(startIndex + itemsPerPage, sortedHoldings.length)}</span> of{" "}
                <span className="font-extrabold text-slate-950">{sortedHoldings.length}</span> holdings
              </p>
              
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  disabled={activePage === 1}
                  onClick={() => setAssetCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 disabled:opacity-50 h-9 px-3.5 rounded-xl text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all"
                >
                  Previous
                </Button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = activePage === pNum;
                  return (
                    <Button
                      key={pNum}
                      onClick={() => setAssetCurrentPage(pNum)}
                      className={`h-9 w-9 text-xs font-extrabold rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                        isCurrent
                          ? `bg-gradient-to-r ${activeGroup.meta.gradient} text-slate-950 shadow-md`
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  disabled={activePage === totalPages}
                  onClick={() => setAssetCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 disabled:opacity-50 h-9 px-3.5 rounded-xl text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Ported Asset Edit Dialog inside Intercept */}
        <Dialog open={!!assetDialog} onOpenChange={(open) => !open && setAssetDialog(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto pr-4">
            <DialogHeader>
              <DialogTitle>{assetDialog?.editId ? "Edit Asset" : "Add Asset"}</DialogTitle>
            </DialogHeader>
            {assetDialog && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Asset Type</Label>
                  <Select value={assetDialog.type} onValueChange={(v: any) => setAssetDialog({ ...assetDialog, type: v, data: {} })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {assetDialog.type === "mutual_fund" && (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label className="text-xs">Asset Name</Label><FundAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} /></div>
                    <div className="col-span-2">
                      <Label className="text-xs">Investment Method</Label>
                      <Select value={assetDialog.data.investmentMethod ?? "Lump sum"} onValueChange={(v) => updateAssetField("investmentMethod", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lump sum">Lump sum / One-time</SelectItem>
                          <SelectItem value="SIP">SIP (Monthly)</SelectItem>
                          <SelectItem value="SWP">SWP (Withdrawal)</SelectItem>
                          <SelectItem value="STP">STP (Transfer)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(!assetDialog.data.investmentMethod || assetDialog.data.investmentMethod === "Lump sum") ? (
                      <>
                        <div>
                          <Label className="text-xs">Transaction Type</Label>
                          <Select value={assetDialog.data.transactionType ?? "Buy"} onValueChange={(v) => updateAssetField("transactionType", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div><Label className="text-xs">Date</Label><Input type="date" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} /></div>
                        <div><Label className="text-xs">Units</Label><Input type="number" placeholder="0" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} /></div>
                        <div><Label className="text-xs">Price</Label><Input type="number" placeholder="0.00" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} /></div>
                        <div className="col-span-2">
                          <Label className="text-xs">Amount (auto)</Label>
                          <Input readOnly value={assetDialog.data.amount ?? "0"} className="bg-muted" />
                        </div>
                      </>
                    ) : assetDialog.data.investmentMethod === "SIP" ? (
                      <>
                        <div><Label className="text-xs">Monthly SIP Amount</Label><Input type="number" placeholder="0" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} /></div>
                        <div><Label className="text-xs">SIP Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                        <div><Label className="text-xs">Tenure (Years)</Label><Input type="number" placeholder="0" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                        <div><Label className="text-xs">Expected Return Rate (%)</Label><Input type="number" placeholder="0" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                      </>
                    ) : assetDialog.data.investmentMethod === "SWP" ? (
                      <>
                        <div className="col-span-2"><Label className="text-xs">Initial Investment Amount</Label><Input type="number" placeholder="0" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} /></div>
                        <div><Label className="text-xs">Monthly Withdrawal (SWP)</Label><Input type="number" placeholder="0" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} /></div>
                        <div><Label className="text-xs">SWP Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                        <div><Label className="text-xs">Tenure (Years)</Label><Input type="number" placeholder="0" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                        <div><Label className="text-xs">Expected Return Rate (%)</Label><Input type="number" placeholder="0" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                      </>
                    ) : assetDialog.data.investmentMethod === "STP" ? (
                      <>
                        <div className="col-span-2"><Label className="text-xs">Transfer to Fund Name</Label><FundAutocomplete value={assetDialog.data.institutionName ?? ""} onChange={(v) => updateAssetField("institutionName", v)} /></div>
                        <div className="col-span-2"><Label className="text-xs">Initial Investment in Source Fund</Label><Input type="number" placeholder="0" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} /></div>
                        <div><Label className="text-xs">Monthly Transfer Amount (STP)</Label><Input type="number" placeholder="0" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} /></div>
                        <div><Label className="text-xs">STP Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                        <div><Label className="text-xs">Tenure (Years)</Label><Input type="number" placeholder="0" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                        <div><Label className="text-xs">Expected Return Rate (%)</Label><Input type="number" placeholder="0" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                      </>
                    ) : null}
                  </div>
                )}

                {assetDialog.type === "stock" && (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label className="text-xs">Stock Name</Label><StockAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} /></div>
                    <div><Label className="text-xs">Date</Label><Input type="date" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} /></div>
                    <div><Label className="text-xs">Units</Label><Input type="number" placeholder="0" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} /></div>
                    <div><Label className="text-xs">Price</Label><Input type="number" placeholder="0.00" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} /></div>
                    <div className="col-span-2">
                      <Label className="text-xs">Amount (auto)</Label>
                      <Input readOnly value={assetDialog.data.amount ?? "0"} className="bg-muted" />
                    </div>
                  </div>
                )}

                {assetDialog.type === "fixed_deposit" && (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label className="text-xs">Bank / Institution Name</Label><Input placeholder="SBI, HDFC..." value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} /></div>
                    <div><Label className="text-xs">Investment Amount</Label><Input type="number" placeholder="0" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} /></div>
                    <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" placeholder="0.00" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                    <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                    <div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div>
                    <div className="col-span-2">
                      <Label className="text-xs">Payout Type</Label>
                      <Select value={assetDialog.data.payoutType ?? "Cumulative"} onValueChange={(v) => updateAssetField("payoutType", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cumulative">Cumulative (On Maturity)</SelectItem>
                          <SelectItem value="Monthly">Monthly Payout</SelectItem>
                          <SelectItem value="Quarterly">Quarterly Payout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {assetDialog.type === "recurring_deposit" && (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label className="text-xs">Bank / Institution Name</Label><Input placeholder="SBI, HDFC..." value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} /></div>
                    <div><Label className="text-xs">Monthly Deposit</Label><Input type="number" placeholder="0" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} /></div>
                    <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" placeholder="0.00" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                    <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                    <div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div>
                  </div>
                )}

                {assetDialog.type === "provident_fund" && (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">PF Account Type</Label>
                      <Select value={assetDialog.data.accountType ?? "EPF"} onValueChange={(v) => {
                        updateAssetField("accountType", v);
                        if (v === "PPF") {
                          updateAssetField("basicSalary", "");
                          updateAssetField("dearnessAllowance", "");
                          updateAssetField("employeeContributionPercent", "");
                          updateAssetField("employerContributionPercent", "");
                          updateAssetField("salaryGrowth", "");
                          updateAssetField("includeEPS", "");
                        }
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="EPF">EPF (Employee Provident Fund)</SelectItem><SelectItem value="PPF">PPF (Public Provident Fund)</SelectItem></SelectContent>
                      </Select>
                    </div>

                    {assetDialog.data.accountType === "PPF" ? (
                      <>
                        <div><Label className="text-xs">Annual PPF Contribution</Label><Input type="number" placeholder="0" value={assetDialog.data.amount ?? ""} onChange={(e) => updateAssetField("amount", e.target.value)} /></div>
                        <div><Label className="text-xs">Current Balance</Label><Input type="number" placeholder="0" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} /></div>
                        <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" step="0.1" value={assetDialog.data.interestRate ?? "7.1"} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                        <div><Label className="text-xs">Tenure (Years)</Label><Input type="number" placeholder="15" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                      </>
                    ) : (
                      <>
                        <div><Label className="text-xs">Monthly Basic Salary</Label><Input type="number" placeholder="0" value={assetDialog.data.basicSalary ?? ""} onChange={(e) => updateAssetField("basicSalary", e.target.value)} /></div>
                        <div><Label className="text-xs">Dearness Allowance (DA)</Label><Input type="number" placeholder="0" value={assetDialog.data.dearnessAllowance ?? ""} onChange={(e) => updateAssetField("dearnessAllowance", e.target.value)} /></div>
                        <div><Label className="text-xs">Employee Contribution (%)</Label><Input type="number" placeholder="12" value={assetDialog.data.employeeContributionPercent ?? ""} onChange={(e) => updateAssetField("employeeContributionPercent", e.target.value)} /></div>
                        <div><Label className="text-xs">Employer Contribution (%)</Label><Input type="number" placeholder="12" value={assetDialog.data.employerContributionPercent ?? ""} onChange={(e) => updateAssetField("employerContributionPercent", e.target.value)} /></div>
                        <div><Label className="text-xs">Current EPF Balance</Label><Input type="number" placeholder="0" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} /></div>
                        <div><Label className="text-xs">Current Age</Label><Input type="number" placeholder="30" value={assetDialog.data.age ?? ""} onChange={(e) => updateAssetField("age", e.target.value)} /></div>
                        <div><Label className="text-xs">Retirement Age (auto)</Label><Input readOnly placeholder="60" value="60" className="bg-muted" /></div>
                        <div><Label className="text-xs">Years to Retirement</Label><Input readOnly placeholder="30" value={assetDialog.data.tenureYears ?? ""} className="bg-muted" /></div>
                        <div><Label className="text-xs">Expected Interest Rate (%)</Label><Input type="number" step="0.05" value={assetDialog.data.interestRate ?? "8.15"} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                        <div><Label className="text-xs">Expected Salary Growth (%)</Label><Input type="number" placeholder="5" value={assetDialog.data.salaryGrowth ?? ""} onChange={(e) => updateAssetField("salaryGrowth", e.target.value)} /></div>
                        <div className="col-span-2 flex items-center gap-2 py-1">
                          <input type="checkbox" id="includeEPS" checked={assetDialog.data.includeEPS === "true"} onChange={(e) => updateAssetField("includeEPS", String(e.target.checked))} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" />
                          <Label htmlFor="includeEPS" className="text-xs font-medium cursor-pointer">Deduct EPS (8.33% up to ₹1,250/mo limit) from Employer Share</Label>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {assetDialog.type === "cash_bank" && (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Institution / Holder Name</Label>
                      <Input placeholder="HDFC Savings, In Hand..." value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Available Amount</Label>
                      <Input type="number" placeholder="0" value={assetDialog.data.amount ?? ""} onChange={(e) => updateAssetField("amount", e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={() => setAssetDialog(null)}>Cancel</Button>
              <Button onClick={handleSaveAsset} disabled={createAsset.isPending || updateAsset.isPending}>
                {(createAsset.isPending || updateAsset.isPending) ? "Saving..." : "Save Asset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <ScrollingFeatureShowcase
          slides={CLIENT_DETAIL_SLIDES}
          height="440px"
          ctaText="View Portfolio"
          onClick={() => {
            document.getElementById('assets-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8" data-reveal>
          <div className="flex items-center gap-3">
            <Link href="/admin/clients">
              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-900">
                <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 truncate">{client?.name ?? "Loading..."}</h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium uppercase tracking-widest mt-1 opacity-70">
                @{client?.username} {client?.email ? `· ${client.email}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-reveal data-reveal-delay="100">
          <Card className="glass-panel bg-emerald-50 border-emerald-200 shadow-sm">
            <CardContent className="p-4 sm:p-6 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-[0.2em]">Family Assets</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(summary?.totalAssets ?? 0)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel bg-rose-50 border-rose-200 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-[10px] font-bold text-rose-600/60 uppercase tracking-[0.2em]">Family Liabilities</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(summary?.totalLiabilities ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel bg-primary/5 border-primary/20 shadow-xl shadow-primary/5">
            <CardContent className="pt-6 text-slate-900">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Family Net Worth</p>
              <p className="text-2xl font-black mt-1">
                {formatCurrency(summary?.netWorth ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900">Family Tree</CardTitle>
                <CardDescription className="text-slate-500">Visualize and manage family relationships and their financials</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="border-slate-200" onClick={() => setFamilyMemberDialog({ name: "", dob: "", phone: "", relation: "Child" })}>
                <Plus className="h-4 w-4 mr-2" /> Add Member
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {client && (
              <FamilyTree
                client={{ id: client.id, name: client.name }}
                familyMembers={familyMembers ?? []}
                assets={assets ?? []}
                liabilities={liabilities ?? []}
                onAddMember={(rel) => setFamilyMemberDialog({ name: "", dob: "", phone: "", relation: rel ?? "Child" })}
                onEditMember={(m) => setFamilyMemberDialog({ ...m, dob: m.dob ?? "", phone: m.phone ?? "", relation: m.relation as any, editId: m.id })}
                onDeleteMember={(id) => { if(confirm("Are you sure you want to delete this family member? All their data will be lost.")) deleteFamilyMember.mutate({ clientId, familyMemberId: id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey(clientId) }) }); }}
                onSelectMember={(m) => setSelectedMemberId(m?.id ?? null)}
                selectedMemberId={selectedMemberId}
                readOnly={false}
              />
            )}
          </CardContent>
        </Card>

        {chartData.length > 0 && (() => {
          const total = chartData.reduce((sum, d) => sum + d.value, 0);
          const sorted = [...chartData]
            .map((item, i) => ({ ...item, color: CHART_COLORS[i % CHART_COLORS.length] }))
            .sort((a, b) => b.value - a.value);
          return (
            <Card className="glass-panel border-slate-200 bg-white/60 shadow-sm overflow-visible">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-900 font-semibold">Asset Breakdown</CardTitle>
                    <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-widest font-medium">Portfolio Allocation</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Total Value</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(total)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* ── Stacked allocation strip ── */}
                <div className="mb-2">
                  <div className="flex rounded-2xl overflow-hidden h-9 gap-[2px] bg-slate-100">
                    {sorted.map((item, index) => {
                      const pct = total > 0 ? (item.value / total) * 100 : 0;
                      if (pct < 0.4) return null;
                      return (
                        <div
                          key={index}
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                          className="relative group h-full transition-all duration-200 hover:brightness-110 cursor-pointer"
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-20">
                            <div className="bg-slate-900 text-white text-[11px] rounded-xl px-3 py-2 whitespace-nowrap shadow-2xl">
                              <div className="font-bold text-white">{item.name}</div>
                              <div className="text-slate-300 mt-0.5">{formatCurrency(item.value)}</div>
                              <div className="text-slate-400 text-[10px]">{pct.toFixed(1)}% of portfolio</div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900" />
                            </div>
                          </div>
                          {/* Inline label for wide segments */}
                          {pct > 12 && (
                            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[11px] tracking-wide drop-shadow select-none">
                              {pct.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Color legend chips */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                    {sorted.map((item, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] text-slate-500 font-medium">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Data table ── */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 px-5 py-3 w-6">#</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 px-4 py-3">Asset Class</th>
                        <th className="text-right text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 px-4 py-3">Value</th>
                        <th className="text-right text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 px-5 py-3 hidden sm:table-cell w-48">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((item, index) => {
                        const pct = total > 0 ? (item.value / total) * 100 : 0;
                        return (
                          <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors group">
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] font-bold text-slate-300">#{index + 1}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-3 w-3 rounded-[4px] flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="font-semibold text-slate-700 text-[13px]">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="font-bold text-slate-900 text-[13px] tabular-nums">{formatCurrency(item.value)}</span>
                            </td>
                            <td className="px-5 py-3.5 hidden sm:table-cell">
                              <div className="flex items-center gap-3 justify-end">
                                <div className="flex-1 max-w-[100px] h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                                  />
                                </div>
                                <span className="text-[12px] font-bold text-slate-500 w-10 text-right tabular-nums">{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td className="px-5 py-3.5" />
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Portfolio</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-black text-slate-900 text-[14px] tabular-nums">{formatCurrency(total)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          <span className="text-[12px] font-bold text-slate-500">100%</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Premium Main Switcher Tabs (Assets vs Liabilities) */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/50 max-w-md mx-auto mb-8">
          <button
            onClick={() => setActiveMainTab("assets")}
            className={cn(
              "flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
              activeMainTab === "assets"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-955/10 animate-in fade-in zoom-in-95 duration-150"
                : "text-slate-500 hover:text-slate-900 bg-transparent"
            )}
          >
            <Wallet className="w-4 h-4" />
            Assets
            <span className={cn(
              "ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full transition-all duration-300",
              activeMainTab === "assets" ? "bg-amber-500 text-slate-950" : "bg-slate-200 text-slate-600"
            )}>
              {assets?.filter(a => (a.familyMemberId ?? null) === (selectedMemberId ?? null)).length ?? 0}
            </span>
          </button>
          <button
            onClick={() => setActiveMainTab("liabilities")}
            className={cn(
              "flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
              activeMainTab === "liabilities"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-955/10 animate-in fade-in zoom-in-95 duration-150"
                : "text-slate-500 hover:text-slate-900 bg-transparent"
            )}
          >
            <TrendingDown className="w-4 h-4" />
            Liabilities
            <span className={cn(
              "ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full transition-all duration-300",
              activeMainTab === "liabilities" ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"
            )}>
              {liabilities?.filter(l => (l.familyMemberId ?? null) === (selectedMemberId ?? null)).length ?? 0}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {activeMainTab === "assets" ? (
            /* Assets Section */
            <div data-reveal data-reveal-delay="200" className="space-y-6 animate-in fade-in duration-300">
              {/* ── Section heading ── */}
              <div id="assets-section" className="flex items-center justify-between mb-5 scroll-mt-20">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedMemberId === null ? "My Assets" : `${familyMembers?.find(m => m.id === selectedMemberId)?.name}'s Assets`}
                    <span className="ml-2 text-slate-400 text-sm font-medium">
                      ({assets?.filter(a => (a.familyMemberId ?? null) === (selectedMemberId ?? null)).length ?? 0})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Browse by asset class</p>
                </div>
                <Button size="sm" className="gap-2 shadow-lg shadow-primary/20" onClick={() => { setAssetDialog({ type: "mutual_fund", data: {} }); }}>
                  <Plus className="h-4 w-4" /> Add Asset
                </Button>
              </div>

              {(() => {
                const filteredAssets = assets?.filter(a => (a.familyMemberId ?? null) === (selectedMemberId ?? null)) ?? [];

                const GROUP_META: Record<string, { label: string; plural: string; gradient: string; badgeCls: string; color: string; icon: string }> = {
                  mutual_fund:       { label: "Mutual Fund",        plural: "Mutual Funds",       gradient: "from-amber-400 to-yellow-300",  badgeCls: "bg-amber-50 text-amber-700 border-amber-200",    color: "#f59e0b", icon: "📈" },
                  stock:             { label: "Stock",              plural: "Stocks",             gradient: "from-emerald-500 to-teal-400",  badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "#10b981", icon: "📊" },
                  fixed_deposit:     { label: "Fixed Deposit",     plural: "Fixed Deposits",     gradient: "from-blue-500 to-indigo-400",   badgeCls: "bg-blue-50 text-blue-700 border-blue-200",       color: "#3b82f6", icon: "🏦" },
                  recurring_deposit: { label: "Recurring Deposit", plural: "Recurring Deposits", gradient: "from-violet-500 to-purple-400", badgeCls: "bg-violet-50 text-violet-700 border-violet-200", color: "#8b5cf6", icon: "🔄" },
                  provident_fund:    { label: "PF / PPF",          plural: "Provident Fund",     gradient: "from-orange-500 to-rose-400",   badgeCls: "bg-orange-50 text-orange-700 border-orange-200", color: "#f97316", icon: "🛡️" },
                  cash_bank:         { label: "Cash & Bank",       plural: "Cash & Bank",        gradient: "from-slate-500 to-slate-400",   badgeCls: "bg-slate-100 text-slate-600 border-slate-200",   color: "#64748b", icon: "💵" },
                };

                // Build only groups that exist
                const groups = ASSET_TYPES
                  .map(t => ({
                    typeKey: t.value,
                    meta: GROUP_META[t.value] ?? { label: t.label, plural: t.label, gradient: "from-slate-400 to-slate-300", badgeCls: "bg-slate-100 text-slate-600 border-slate-200", color: "#94a3b8", icon: "💼" },
                    items: filteredAssets.filter(a => a.assetType === t.value),
                  }))
                  .filter(g => g.items.length > 0);

                if (groups.length === 0) return (
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

                // Clamp activeAssetTab to valid range
                const safeTab = Math.min(activeAssetTab, groups.length - 1);
                const activeGroup = groups[safeTab];

                const circularNavItems = groups.map((g, index) => ({
                  name: g.meta.label,
                  icon: ASSET_ICONS[g.typeKey] ?? Compass,
                  href: "#",
                  onClick: () => {
                    setActiveAssetTab(index);
                    setViewHoldingsForType(null);
                    setAssetCurrentPage(1);
                    setMainAssetsPage(1);
                  },
                }));

                return (
                  <div className="space-y-6">
                    {/* ── Premium Asset Navigation Trigger ── */}
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
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-955 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border border-amber-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20 cursor-pointer border-transparent"
                      >
                        <Compass className="w-4 h-4" />
                        Switch Asset Class
                      </Button>
                    </div>

                    <CircularNavigation
                      isOpen={isCircularNavOpen}
                      toggleMenu={() => setIsCircularNavOpen(!isCircularNavOpen)}
                      navItems={circularNavItems}
                    />

                    {/* Detailed Summary Dashboard */}
                    <Card className="overflow-hidden border border-slate-200 bg-white shadow-md rounded-3xl">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${activeGroup.meta.gradient}`} />
                      <CardContent className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                              <span>{activeGroup.meta.label} Portfolio Summary</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Unified performance metrics for all {activeGroup.items.length} dynamic asset holdings</p>
                          </div>
                          
                          <Button
                            onClick={() => setViewHoldingsForType(activeGroup.typeKey)}
                            className={`bg-gradient-to-r ${activeGroup.meta.gradient} hover:opacity-90 text-slate-955 font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer border-transparent`}
                          >
                            Explore Holdings & Visualisation
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Stats Grid */}
                        {(() => {
                          const totals = activeGroup.items.reduce((acc, asset) => {
                            const live = liveValues[asset.id];
                            const vals = live ? live : getAssetCurrentAndInvested(asset);
                            return {
                              invested: acc.invested + vals.invested,
                              current: acc.current + vals.current,
                            };
                          }, { invested: 0, current: 0 });

                          const totalGain = totals.current - totals.invested;
                          const gainPercentage = totals.invested > 0 ? (totalGain / totals.invested) * 100 : 0;
                          const isPositive = totalGain >= 0;

                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5">
                                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Total Invested Amount</p>
                                  <p className="text-2xl font-black text-slate-900 mt-1.5 tabular-nums">{formatCurrency(totals.invested)}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">Cost value of holdings</p>
                                </div>

                                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5">
                                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Current Market Value</p>
                                  <p className="text-2xl font-black text-slate-900 mt-1.5 tabular-nums">{formatCurrency(totals.current)}</p>
                                  <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Live Valued
                                  </p>
                                </div>

                                <div className={`border rounded-2xl p-4.5 ${isPositive ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-rose-50/30 border-rose-100/50'}`}>
                                  <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isPositive ? 'text-emerald-700/80' : 'text-rose-700/80'}`}>Net Portfolio Returns</p>
                                  <p className={`text-2xl font-black mt-1.5 tabular-nums flex items-center gap-1.5 ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {isPositive ? "+" : ""}{formatCurrency(totalGain)}
                                  </p>
                                  <p className={`text-xs font-black mt-1 flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                    {isPositive ? "+" : ""}{gainPercentage.toFixed(2)}% Growth
                                  </p>
                                </div>
                              </div>

                              {/* Visual Breakdown Section */}
                              {(() => {
                                const sortedItems = [...activeGroup.items].sort((a, b) => b.id - a.id);
                                const itemsPerPage = 10;
                                const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
                                const activePage = Math.min(mainAssetsPage, totalPages);
                                const paginatedItems = sortedItems.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

                                return (
                                  <div className="space-y-3.5 border-t border-slate-100 pt-5">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Asset Weight &amp; Distribution Visualisation</h4>
                                    <div className="space-y-4">
                                      {paginatedItems.map((item) => (
                                        <AssetDistributionCard
                                          key={item.id}
                                          item={item}
                                          totals={totals}
                                          onResolved={handleLiveValueResolved}
                                          activeGroup={activeGroup}
                                        />
                                      ))}
                                    </div>

                                    {/* Pagination footer for Assets */}
                                    {totalPages > 1 && (
                                      <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-4">
                                        <p className="text-xs text-slate-500">
                                          Showing <span className="font-bold text-slate-900">{(activePage - 1) * itemsPerPage + 1}</span> to{" "}
                                          <span className="font-bold text-slate-900">{Math.min(activePage * itemsPerPage, sortedItems.length)}</span> of{" "}
                                          <span className="font-bold text-slate-900">{sortedItems.length}</span> entries
                                        </p>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={activePage === 1}
                                            onClick={() => setMainAssetsPage(activePage - 1)}
                                            className="rounded-xl border-slate-200"
                                          >
                                            Previous
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={activePage === totalPages}
                                            onClick={() => setMainAssetsPage(activePage + 1)}
                                            className="rounded-xl border-slate-200"
                                          >
                                            Next
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Liabilities Section */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div id="liabilities-section" className="flex items-center justify-between scroll-mt-20">
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedMemberId === null ? "My Liabilities" : `${familyMembers?.find(m => m.id === selectedMemberId)?.name}'s Liabilities`} 
                  <span className="ml-2 text-slate-400 text-sm font-medium">({liabilities?.filter(l => (l.familyMemberId ?? null) === (selectedMemberId ?? null)).length ?? 0})</span>
                </h2>
                <Button size="sm" variant="destructive" className="gap-2 shadow-lg shadow-rose-500/20" onClick={() => setLiabilityDialog({ 
                    liabilityType: "Loans", 
                    loanType: "home_loan", 
                    lenderName: "", 
                    totalLoanAmount: "", 
                    outstandingAmount: "", 
                    interestRate: "", 
                    emi: "", 
                    startDate: "", 
                    endDate: "", 
                    interestType: "Reducing", 
                    subType: "", 
                    tenure: "", 
                    income: "", 
                    tds: "", 
                    advanceTax: "", 
                    standardDeduction: "75000", 
                    insuranceCategory: "", 
                    insuranceSubtype: "", 
                    propertyValue: "", 
                    insuranceRate: "", 
                    premium: "", 
                    tenureYears: "", 
                    baseRate: "", 
                    addOns: "", 
                    discounts: "", 
                    householdCategory: "",
                    householdAmount: "",
                    rent: "", maintenance: "", taxes: "",
                    electricity: "", water: "", gas: "", internet: "",
                    groceries: "",
                    fees: "", books: "", academicCosts: "",
                    maidSalary: "", cookSalary: "", serviceCosts: "",
                    medicalBills: "", medicines: "", miscCosts: ""
                  })}>
                    <Plus className="h-4 w-4" /> Add Liability
                  </Button>
              </div>
              {(() => {
                const filteredLiabilities = liabilities?.filter(l => (l.familyMemberId ?? null) === (selectedMemberId ?? null)) ?? [];
                const sortedLiabilities = [...filteredLiabilities].sort((a, b) => b.id - a.id);
                const itemsPerPage = 10;
                const totalLiabilitiesPages = Math.max(1, Math.ceil(sortedLiabilities.length / itemsPerPage));
                const activePage = Math.min(mainLiabilitiesPage, totalLiabilitiesPages);
                const paginatedLiabilities = sortedLiabilities.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

                if (paginatedLiabilities.length === 0) {
                  return <Card className="glass-panel border-slate-200 border-dashed bg-slate-50/50"><CardContent className="py-8 text-center text-slate-400 text-sm font-semibold italic">No liabilities recorded for this family member</CardContent></Card>;
                }
                
                return (
                  <div className="space-y-4">
                    {paginatedLiabilities.map((liability) => (
                      <Card key={liability.id} className="glass-panel border-slate-100 bg-white hover:bg-slate-50 hover:shadow-md transition-all shadow-sm rounded-3xl overflow-hidden relative border-l-4 border-l-rose-500">
                        <CardContent className="p-3 sm:p-6 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <Badge variant="destructive" className="text-[10px] mb-2 bg-rose-50 text-rose-600 border-rose-100 uppercase tracking-wider font-bold">
                                {(() => {
                                  const parts = liability.notes?.split("|") ?? [];
                                  const type = parts[0];
                                  const subType = parts[parts.length - 1];
                                  const hasModel = parts.length > 1 && subType !== "Flat";
                                  
                                  if (type === "Loans") return LOAN_LABELS[liability.loanType];
                                  if (type === "Bills" && subType && subType !== "Bills") return `Bills - ${subType}`;
                                  if (type === "Insurance Dues") {
                                    const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1];
                                    const sub = parts.find(p => p.startsWith("Sub:"))?.split(":")[1];
                                    return sub ? `${cat} - ${sub}` : (cat ?? "Insurance");
                                  }
                                  if (hasModel) return `${type} - ${subType}`;
                                  return type || LOAN_LABELS[liability.loanType];
                                })()}
                              </Badge>
                              <p className="text-base font-bold text-slate-900">{liability.lenderName}</p>
                              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {(() => {
                                  const parts = liability.notes?.split("|") ?? [];
                                  const type = parts[0];
                                  if (type === "Taxes") {
                                    const inc = parts.find(p => p.startsWith("Income:"))?.split(":")[1] ?? "0";
                                    const tds = parts.find(p => p.startsWith("TDS:"))?.split(":")[1] ?? "0";
                                    const adv = parts.find(p => p.startsWith("Advance:"))?.split(":")[1] ?? "0";
                                    return (
                                      <>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Net Tax Payable: <span className="text-slate-900 font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Outstanding: <span className="text-rose-600 font-bold">{formatCurrency(liability.outstandingAmount)}</span></p>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Annual Income: <span className="text-slate-700 font-medium">{formatCurrency(parseFloat(inc))}</span></p>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">TDS Paid: <span className="text-slate-700 font-medium">{formatCurrency(parseFloat(tds))}</span></p>
                                        {adv !== "0" && <p className="flex justify-between border-b border-slate-200 py-0.5">Advance Tax: <span className="text-slate-700 font-medium">{formatCurrency(parseFloat(adv))}</span></p>}
                                        {liability.startDate && <p className="flex justify-between last:border-0 py-0.5">Due Date: <span className="text-slate-500">{formatDate(liability.startDate)}</span></p>}
                                      </>
                                    );
                                  }
                                  if (type === "Bills") {
                                    return (
                                      <>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Original Bill: <span className="text-slate-900 font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Current Outstanding: <span className="text-rose-600 font-bold">{formatCurrency(liability.outstandingAmount)}</span></p>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Penalty Rate: <span className="text-slate-700 font-medium">{liability.interestRate}%</span></p>
                                        {liability.startDate && <p className="flex justify-between last:border-0 py-0.5">Due Date: <span className="text-slate-500">{formatDate(liability.startDate)}</span></p>}
                                      </>
                                    );
                                  }
                                  if (type === "Insurance Dues") {
                                    const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1] ?? "";
                                    const sub = parts.find(p => p.startsWith("Sub:"))?.split(":")[1];
                                    const prem = parts.find(p => p.startsWith("Premium:"))?.split(":")[1];
                                    const yrs = parts.find(p => p.startsWith("Years:"))?.split(":")[1];
                                    return (
                                      <>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Total Premium: <span className="text-slate-900 font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                        <p className="flex justify-between border-b border-slate-200 py-0.5">Amount Due: <span className="text-rose-600 font-bold">{formatCurrency(liability.outstandingAmount)}</span></p>
                                        {prem && <p className="flex justify-between border-b border-slate-200 py-0.5">Annual Premium: <span className="text-slate-700 font-medium">{formatCurrency(parseFloat(prem))}</span></p>}
                                        {yrs && <p className="flex justify-between border-b border-slate-200 py-0.5">Tenure: <span className="text-slate-700 font-medium">{yrs} yrs</span></p>}
                                        {sub && <p className="flex justify-between border-b border-slate-200 py-0.5">Type: <span className="text-slate-700 font-medium">{sub}</span></p>}
                                        {liability.startDate && <p className="flex justify-between last:border-0 py-0.5">Start: <span className="text-slate-500">{formatDate(liability.startDate)}</span></p>}
                                      </>
                                    );
                                  }
                                   if (type === "Household Obligations") {
                                     const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1];
                                     return (
                                       <>
                                         <p className="flex justify-between border-b border-slate-200 py-0.5">Monthly Amount: <span className="text-slate-900 font-bold">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                         {cat && <p className="flex justify-between border-b border-slate-200 py-0.5">Category: <span className="text-slate-700 font-medium">{cat}</span></p>}
                                         {liability.startDate && <p className="flex justify-between border-b border-slate-200 py-0.5">Start Date: <span className="text-slate-500">{formatDate(liability.startDate)}</span></p>}
                                         {liability.endDate && <p className="flex justify-between last:border-0 py-0.5">End Date: <span className="text-slate-500">{formatDate(liability.endDate)}</span></p>}
                                       </>
                                     );
                                   }
                                  return (
                                    <>
                                      <p className="flex justify-between border-b border-slate-200 py-0.5">Total: <span className="text-slate-900 font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                      <p className="flex justify-between border-b border-slate-200 py-0.5">Outstanding: <span className="text-rose-600 font-bold">{formatCurrency(liability.outstandingAmount)}</span></p>
                                      <p className="flex justify-between border-b border-slate-200 py-0.5">Interest: <span className="text-slate-700 font-medium">{liability.interestRate}%</span></p>
                                      <p className="flex justify-between border-b border-slate-200 py-0.5">EMI: <span className="text-slate-700 font-medium">{formatCurrency(liability.emi)}</span></p>
                                      {liability.startDate && <p className="flex justify-between border-b border-slate-200 py-0.5">Start: <span className="text-slate-500">{formatDate(liability.startDate)}</span></p>}
                                      {liability.endDate && <p className="flex justify-between last:border-0 py-0.5">End: <span className="text-slate-500">{formatDate(liability.endDate)}</span></p>}
                                    </>
                                  );
                                })()}
                              </div>
                              {(!liability.notes?.startsWith("Taxes") && !liability.notes?.startsWith("Bills") && !liability.notes?.startsWith("Insurance Dues") && (liability.loanType === "home_loan" || liability.loanType === "car_loan" || liability.loanType === "personal_loan" || liability.loanType === "business_loan" || liability.loanType === "education_loan" || liability.notes?.startsWith("Loans") || liability.notes?.startsWith("Credit Cards & BNPL") || liability.notes?.startsWith("EMIs"))) && (
                                <LoanValuation liability={liability} />
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => {
                                const parts = liability.notes?.split("|") ?? [];
                                const type = parts[0];
                                setLiabilityDialog({
                                  editId: liability.id,
                                  liabilityType: type,
                                  loanType: liability.loanType,
                                  lenderName: liability.lenderName,
                                  totalLoanAmount: String(liability.totalLoanAmount),
                                  outstandingAmount: String(liability.outstandingAmount),
                                  interestRate: String(liability.interestRate),
                                  emi: String(liability.emi),
                                  startDate: liability.startDate?.split("T")[0] ?? "",
                                  endDate: liability.endDate?.split("T")[0] ?? "",
                                  interestType: parts.includes("Flat") ? "Flat" : "Reducing",
                                  subType: parts[parts.length - 1] === "Flat" ? "" : parts[parts.length - 1],
                                  tenure: "", 
                                  income: parts.find(p => p.startsWith("Income:"))?.split(":")[1] ?? "",
                                  tds: parts.find(p => p.startsWith("TDS:"))?.split(":")[1] ?? "",
                                  advanceTax: parts.find(p => p.startsWith("Advance:"))?.split(":")[1] ?? "",
                                  standardDeduction: parts.find(p => p.startsWith("StdDed:"))?.split(":")[1] ?? "75000",
                                  insuranceCategory: parts.find(p => p.startsWith("Cat:"))?.split(":")[1] ?? "",
                                  insuranceSubtype: parts.find(p => p.startsWith("Sub:"))?.split(":")[1] ?? "",
                                  propertyValue: "",
                                  insuranceRate: String(liability.interestRate),
                                  premium: parts.find(p => p.startsWith("Premium:"))?.split(":")[1] ?? "",
                                  tenureYears: parts.find(p => p.startsWith("Years:"))?.split(":")[1] ?? "",
                                  baseRate: parts.find(p => p.startsWith("Base:"))?.split(":")[1] ?? "",
                                  addOns: parts.find(p => p.startsWith("Addons:"))?.split(":")[1] ?? "",
                                  discounts: parts.find(p => p.startsWith("Disc:"))?.split(":")[1] ?? "",
                                  householdCategory: parts.find(p => p.startsWith("Cat:"))?.split(":")[1] ?? "",
                                  householdAmount: parts.find(p => p.startsWith("Amt:"))?.split(":")[1] ?? "",
                                  rent: parts.find(p => p.startsWith("Rent:"))?.split(":")[1] ?? "",
                                  maintenance: parts.find(p => p.startsWith("Maint:"))?.split(":")[1] ?? "",
                                  taxes: parts.find(p => p.startsWith("Taxes:"))?.split(":")[1] ?? "",
                                  electricity: parts.find(p => p.startsWith("Elec:"))?.split(":")[1] ?? "",
                                  water: parts.find(p => p.startsWith("Water:"))?.split(":")[1] ?? "",
                                  gas: parts.find(p => p.startsWith("Gas:"))?.split(":")[1] ?? "",
                                  internet: parts.find(p => p.startsWith("Net:"))?.split(":")[1] ?? "",
                                  groceries: parts.find(p => p.startsWith("Groceries:"))?.split(":")[1] ?? "",
                                  fees: parts.find(p => p.startsWith("Fees:"))?.split(":")[1] ?? "",
                                  books: parts.find(p => p.startsWith("Books:"))?.split(":")[1] ?? "",
                                  academicCosts: parts.find(p => p.startsWith("Acad:"))?.split(":")[1] ?? "",
                                  maidSalary: parts.find(p => p.startsWith("Maid:"))?.split(":")[1] ?? "",
                                  cookSalary: parts.find(p => p.startsWith("Cook:"))?.split(":")[1] ?? "",
                                  serviceCosts: parts.find(p => p.startsWith("Serv:"))?.split(":")[1] ?? "",
                                  medicalBills: parts.find(p => p.startsWith("MedB:"))?.split(":")[1] ?? "",
                                  medicines: parts.find(p => p.startsWith("MedI:"))?.split(":")[1] ?? "",
                                  miscCosts: parts.find(p => p.startsWith("Misc:"))?.split(":")[1] ?? "",
                                });
                              }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => { if(confirm("Delete liability?")) deleteLiability.mutateAsync({ clientId: clientId!, liabilityId: liability.id }).then(invalidate); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Pagination footer for Liabilities */}
                    {totalLiabilitiesPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-4">
                        <p className="text-xs text-slate-500">
                          Showing <span className="font-bold text-slate-900">{(activePage - 1) * itemsPerPage + 1}</span> to{" "}
                          <span className="font-bold text-slate-900">{Math.min(activePage * itemsPerPage, sortedLiabilities.length)}</span> of{" "}
                          <span className="font-bold text-slate-900">{sortedLiabilities.length}</span> entries
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activePage === 1}
                            onClick={() => setMainLiabilitiesPage(activePage - 1)}
                            className="rounded-xl border-slate-200"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activePage === totalLiabilitiesPages}
                            onClick={() => setMainLiabilitiesPage(activePage + 1)}
                            className="rounded-xl border-slate-200"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!assetDialog} onOpenChange={(open) => !open && setAssetDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto pr-4">
          <DialogHeader>
            <DialogTitle>{assetDialog?.editId ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>
          {assetDialog && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Asset Type</Label>
                <Select value={assetDialog.type} onValueChange={(v: any) => setAssetDialog({ ...assetDialog, type: v, data: {} })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {assetDialog.type === "mutual_fund" && (
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label className="text-xs">Asset Name</Label><FundAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} /></div>
                  <div className="col-span-2">
                    <Label className="text-xs">Investment Method</Label>
                    <Select value={assetDialog.data.investmentMethod ?? "Lump sum"} onValueChange={(v) => updateAssetField("investmentMethod", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lump sum">Lump sum / One-time</SelectItem>
                        <SelectItem value="SIP">SIP (Monthly)</SelectItem>
                        <SelectItem value="SWP">SWP (Withdrawal)</SelectItem>
                        <SelectItem value="STP">STP (Transfer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(!assetDialog.data.investmentMethod || assetDialog.data.investmentMethod === "Lump sum") ? (
                    <>
                      <div>
                        <Label className="text-xs">Transaction Type</Label>
                        <Select value={assetDialog.data.transactionType ?? "Buy"} onValueChange={(v) => updateAssetField("transactionType", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Date</Label><Input type="date" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} /></div>
                      <div><Label className="text-xs">Units</Label><Input type="number" placeholder="0" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} /></div>
                      <div><Label className="text-xs">Price</Label><Input type="number" placeholder="0.00" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} /></div>
                      <div className="col-span-2">
                        <Label className="text-xs">Amount (auto)</Label>
                        <Input readOnly value={assetDialog.data.amount ?? "0"} className="bg-muted" />
                      </div>
                    </>
                  ) : assetDialog.data.investmentMethod === "SIP" ? (
                    <>
                      <div><Label className="text-xs">Monthly SIP Amount</Label><Input type="number" placeholder="5000" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} /></div>
                      <div><Label className="text-xs">Expected Return (%)</Label><Input type="number" placeholder="12" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                      <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                      <div><Label className="text-xs">Duration (years)</Label><Input type="number" placeholder="10" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                    </>
                  ) : assetDialog.data.investmentMethod === "SWP" ? (
                    <>
                      <div><Label className="text-xs">Initial Investment</Label><Input type="number" placeholder="1000000" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} /></div>
                      <div><Label className="text-xs">Monthly Withdrawal</Label><Input type="number" placeholder="10000" value={assetDialog.data.monthlyWithdrawal ?? ""} onChange={(e) => updateAssetField("monthlyWithdrawal", e.target.value)} /></div>
                      <div><Label className="text-xs">Expected Return (%)</Label><Input type="number" placeholder="8" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                      <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                      <div><Label className="text-xs">Duration (years)</Label><Input type="number" placeholder="10" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2"><Label className="text-xs">Target Fund Name</Label><Input placeholder="Fund to transfer into..." value={assetDialog.data.targetFundName ?? ""} onChange={(e) => updateAssetField("targetFundName", e.target.value)} /></div>
                      <div><Label className="text-xs">Source Investment</Label><Input type="number" placeholder="500000" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} /></div>
                      <div><Label className="text-xs">Monthly Transfer</Label><Input type="number" placeholder="5000" value={assetDialog.data.monthlyTransfer ?? ""} onChange={(e) => updateAssetField("monthlyTransfer", e.target.value)} /></div>
                      <div><Label className="text-xs">Source Return (%)</Label><Input type="number" placeholder="6" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                      <div><Label className="text-xs">Target Return (%)</Label><Input type="number" placeholder="12" value={assetDialog.data.targetInterestRate ?? ""} onChange={(e) => updateAssetField("targetInterestRate", e.target.value)} /></div>
                      <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                      <div><Label className="text-xs">Duration (years)</Label><Input type="number" placeholder="5" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                    </>
                  )}
                </div>
              )}
              {assetDialog.type === "stock" && (
                <div className="col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset Selection</Label>
                    <StockAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} />
                  </div>
                  
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/55 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Transaction Type</Label>
                        <Select value={assetDialog.data.transactionType ?? "Buy"} onValueChange={(v) => updateAssetField("transactionType", v)}>
                          <SelectTrigger className="bg-white border-slate-200 text-slate-900 shadow-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-900">
                            <SelectItem value="Buy">Buy</SelectItem>
                            <SelectItem value="Sell">Sell</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Transaction Date</Label>
                        <Input type="date" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Units</Label>
                        <Input type="number" placeholder="e.g. 10" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Price per Unit (₹)</Label>
                        <Input type="number" placeholder="e.g. 150.00" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Total Transaction Amount</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                        {formatCurrency(parseFloat(assetDialog.data.amount || "0"))}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-600">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              )}
              {assetDialog.type === "fixed_deposit" && (
                <div className="col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Institution Details</Label>
                    <Input placeholder="e.g. HDFC Bank, ICICI Bank" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} />
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/55 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Investment Amount (₹)</Label>
                        <Input type="number" placeholder="e.g. 1,00,000" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Interest Rate (% p.a.)</Label>
                        <Input type="number" placeholder="e.g. 7.1" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Start Date</Label>
                        <Input type="date" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Maturity Date</Label>
                        <Input type="date" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-slate-700">Interest Payout Type</Label>
                      <Select value={assetDialog.data.payoutType ?? "Annual"} onValueChange={(v) => updateAssetField("payoutType", v)}>
                        <SelectTrigger className="bg-white border-slate-200 text-slate-900 shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900">
                          <SelectItem value="Annual">Cumulative / Annual Payout</SelectItem>
                          <SelectItem value="Monthly">Monthly Payout</SelectItem>
                          <SelectItem value="Quarterly">Quarterly Payout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              {assetDialog.type === "recurring_deposit" && (
                <div className="col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Institution Details</Label>
                    <Input placeholder="e.g. SBI, Post Office" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} />
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/55 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Monthly Contribution (₹)</Label>
                        <Input type="number" placeholder="e.g. 5,000" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Interest Rate (% p.a.)</Label>
                        <Input type="number" placeholder="e.g. 6.8" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Start Date</Label>
                        <Input type="date" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-700">Maturity Date</Label>
                        <Input type="date" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {assetDialog.type === "provident_fund" && (
                <div className="col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fund Type</Label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        className={cn(
                          "py-2 text-xs font-bold rounded-lg transition-all",
                          (assetDialog.data.accountType ?? "PPF") === "PPF"
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-900 bg-transparent border border-transparent"
                        )}
                        onClick={() => updateAssetField("accountType", "PPF")}
                      >
                        Public Provident Fund (PPF)
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "py-2 text-xs font-bold rounded-lg transition-all",
                          assetDialog.data.accountType === "EPF"
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-900 bg-transparent border border-transparent"
                        )}
                        onClick={() => updateAssetField("accountType", "EPF")}
                      >
                        Employee Provident Fund (EPF)
                      </button>
                    </div>
                  </div>

                  {assetDialog.data.accountType === "EPF" ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Salary Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Basic Salary (Monthly)</Label>
                            <Input type="number" placeholder="e.g. 50,000" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.basicSalary ?? ""} onChange={(e) => updateAssetField("basicSalary", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Dearness Allowance (Monthly)</Label>
                            <Input type="number" placeholder="e.g. 10,000" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.dearnessAllowance ?? ""} onChange={(e) => updateAssetField("dearnessAllowance", e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Contribution & Growth</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Your Current Age</Label>
                            <Input type="number" placeholder="e.g. 30" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.age ?? ""} onChange={(e) => updateAssetField("age", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Contribution Rate (%)</Label>
                            <Input type="number" placeholder="default 12" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.employeeContributionPercent ?? ""} onChange={(e) => updateAssetField("employeeContributionPercent", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700">EPF Interest Rate (%)</Label>
                            <Input type="number" placeholder="default 8.15" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Duration (Years)</Label>
                            <Input type="number" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="col-span-2">
                            <Label className="text-xs font-medium text-slate-700">Current EPF Balance (₹)</Label>
                            <Input type="number" placeholder="Optional - Current balance if any" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs font-medium text-slate-700">Expected Annual Salary Growth (%)</Label>
                            <Input type="number" placeholder="Optional - Annual hike percent" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.salaryGrowth ?? ""} onChange={(e) => updateAssetField("salaryGrowth", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">PPF Contribution Details</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium text-slate-700">Start Date</Label>
                          <Input type="date" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-700">Maturity Date</Label>
                          <Input type="date" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium text-slate-700">Annual Contribution (₹)</Label>
                          <Input type="number" placeholder="e.g. 1,50,000" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.totalContribution ?? ""} onChange={(e) => updateAssetField("totalContribution", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-700">PPF Interest Rate (% p.a.)</Label>
                          <Input type="number" placeholder="default 7.1" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {assetDialog.type === "cash_bank" && (
                <div className="col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Details</Label>
                    <Input placeholder="e.g. HDFC Bank, ICICI Bank Cash Account" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.bankName ?? ""} onChange={(e) => updateAssetField("bankName", e.target.value)} />
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs font-medium text-slate-700">Account Category</Label>
                        <Select value={assetDialog.data.accountType ?? "Savings"} onValueChange={(v) => updateAssetField("accountType", v)}>
                          <SelectTrigger className="bg-white border-slate-200 text-slate-900 shadow-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-900">
                            <SelectItem value="Savings">Savings Account</SelectItem>
                            <SelectItem value="Current">Current Account</SelectItem>
                            <SelectItem value="Cash">Physical Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs font-medium text-slate-700">Current Available Balance (₹)</Label>
                        <Input type="number" placeholder="e.g. 50,000" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveAsset} disabled={createAsset.isPending || updateAsset.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!liabilityDialog} onOpenChange={(open) => !open && setLiabilityDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto pr-4">
          <DialogHeader>
            <DialogTitle>{liabilityDialog?.editId ? "Edit Liability" : "Add Liability"}</DialogTitle>
          </DialogHeader>
          {liabilityDialog && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Liability Type</Label>
                <Select value={liabilityDialog.liabilityType} onValueChange={(v) => updateLiabilityField("liabilityType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LIABILITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {liabilityDialog.liabilityType === "Loans" && (
                <div><Label className="text-xs">Loan Type</Label>
                  <Select value={liabilityDialog.loanType} onValueChange={(v) => updateLiabilityField("loanType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {liabilityDialog.loanType === "personal_loan" && (
                <div><Label className="text-xs">Interest Type</Label>
                  <Select value={liabilityDialog.interestType} onValueChange={(v) => updateLiabilityField("interestType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reducing">Reducing</SelectItem>
                      <SelectItem value="Flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {liabilityDialog.loanType === "business_loan" && (
                <div><Label className="text-xs">Business Loan Type</Label>
                  <Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUSINESS_LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {liabilityDialog.liabilityType === "EMIs" && (
                <div><Label className="text-xs">Repayment Model</Label>
                  <Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard EMI">Standard EMI</SelectItem>
                      <SelectItem value="No Cost EMI">No Cost EMI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {liabilityDialog.liabilityType === "Bills" && (
                <div><Label className="text-xs">Bill Category</Label>
                  <Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>{BILL_CATEGORIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {liabilityDialog.liabilityType === "Taxes" && (
                <div className="col-span-2 grid grid-cols-3 gap-3 border p-3 rounded-md bg-muted/20">
                  <div className="col-span-3 font-semibold text-xs text-primary uppercase">Tax Liability Calculator</div>
                  <div><Label className="text-[10px]">Annual Income</Label><Input type="number" value={liabilityDialog.income} onChange={(e) => updateLiabilityField("income", e.target.value)} /></div>
                  <div><Label className="text-[10px]">Std. Deduction</Label><Input type="number" value={liabilityDialog.standardDeduction} onChange={(e) => updateLiabilityField("standardDeduction", e.target.value)} /></div>
                  <div><Label className="text-[10px]">TDS Paid</Label><Input type="number" value={liabilityDialog.tds} onChange={(e) => updateLiabilityField("tds", e.target.value)} /></div>
                  <div className="col-span-1"><Label className="text-[10px]">Advance Tax</Label><Input type="number" value={liabilityDialog.advanceTax} onChange={(e) => updateLiabilityField("advanceTax", e.target.value)} /></div>
                  <div className="col-span-2 flex items-end pb-1"><p className="text-[10px] text-muted-foreground italic">*Includes 4% Health & Education Cess and 87A Rebate check.</p></div>
                </div>
              )}

              {liabilityDialog.liabilityType === "Insurance Dues" && (
                <div className="col-span-2 grid grid-cols-2 gap-3 border p-3 rounded-md bg-muted/20">
                  <div className="col-span-2 font-semibold text-xs text-primary uppercase">Insurance Details</div>
                  <div>
                    <Label className="text-[10px]">Insurance Category</Label>
                    <Select value={liabilityDialog.insuranceCategory} onValueChange={(v) => updateLiabilityField("insuranceCategory", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>{INSURANCE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Vehicle Insurance") && (
                    <div>
                      <Label className="text-[10px]">Sub-type</Label>
                      <Select value={liabilityDialog.insuranceSubtype} onValueChange={(v) => updateLiabilityField("insuranceSubtype", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Sub-type" /></SelectTrigger>
                        <SelectContent>
                          {liabilityDialog.insuranceCategory === "Life Insurance" 
                            ? LIFE_INSURANCE_SUBTYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)
                            : VEHICLE_INSURANCE_SUBTYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {liabilityDialog.insuranceCategory && (
                    <>
                      {liabilityDialog.insuranceCategory === "Home Insurance" ? (
                        <>
                          <div><Label className="text-[10px]">Property Value</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.propertyValue} onChange={(e) => updateLiabilityField("propertyValue", e.target.value)} /></div>
                          <div><Label className="text-[10px]">Insurance Rate (%)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.interestRate} onChange={(e) => updateLiabilityField("interestRate", e.target.value)} /></div>
                          <p className="col-span-2 text-[10px] text-muted-foreground italic">*Premium = Property Value × Insurance Rate</p>
                        </>
                      ) : liabilityDialog.insuranceCategory === "Vehicle Insurance" ? (
                        <>
                          <div className="col-span-2 grid grid-cols-3 gap-2">
                             <div><Label className="text-[10px]">Base Rate (IDV)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.baseRate} onChange={(e) => updateLiabilityField("baseRate", e.target.value)} /></div>
                             <div><Label className="text-[10px]">Add-ons</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.addOns} onChange={(e) => updateLiabilityField("addOns", e.target.value)} /></div>
                             <div><Label className="text-[10px]">Discounts / NCB</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.discounts} onChange={(e) => updateLiabilityField("discounts", e.target.value)} /></div>
                          </div>
                          <div className="col-span-2"><Label className="text-[10px]">Annual Premium (auto)</Label><Input className="h-8 text-xs bg-muted" readOnly value={liabilityDialog.premium} /></div>
                        </>
                      ) : (
                        <>
                          <div><Label className="text-[10px]">Annual Premium (₹)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.premium} onChange={(e) => updateLiabilityField("premium", e.target.value)} /></div>
                          {(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Health Insurance") && (
                            <div><Label className="text-[10px]">Tenure (Years)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.tenureYears} onChange={(e) => updateLiabilityField("tenureYears", e.target.value)} /></div>
                          )}
                          {liabilityDialog.insuranceSubtype === "ULIP" && (
                            <div><Label className="text-[10px]">Expected Return (%)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.interestRate} onChange={(e) => updateLiabilityField("interestRate", e.target.value)} /></div>
                          )}
                          <p className="col-span-2 text-[10px] text-muted-foreground italic">
                            {liabilityDialog.insuranceSubtype === "ULIP" ? "*Value = Premium × (1 + Rate)^Years  (Compound)" :
                             liabilityDialog.insuranceCategory === "Travel Insurance" ? "*Cost = Annual Premium (Fixed)" :
                             "*Total = Premium × Years"}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {liabilityDialog.liabilityType === "Household Obligations" && (
                <div className="col-span-2 grid grid-cols-2 gap-3 border p-3 rounded-md bg-muted/20">
                  <div className="col-span-2 font-semibold text-xs text-primary uppercase">Household Obligation Details</div>
                  <div className={liabilityDialog.householdCategory ? "col-span-2" : "col-span-2"}>
                    <Label className="text-[10px]">Expense Category</Label>
                    <Select value={liabilityDialog.householdCategory} onValueChange={(v) => updateLiabilityField("householdCategory", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>{HOUSEHOLD_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  
                  {liabilityDialog.householdCategory === "Housing" && (
                    <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                      <div><Label className="text-[9px]">Rent</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.rent} onChange={(e) => updateLiabilityField("rent", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Maintenance</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.maintenance} onChange={(e) => updateLiabilityField("maintenance", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Taxes</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.taxes} onChange={(e) => updateLiabilityField("taxes", e.target.value)} /></div>
                    </div>
                  )}
                  
                  {liabilityDialog.householdCategory === "Utilities" && (
                    <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                      <div><Label className="text-[9px]">Electricity</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.electricity} onChange={(e) => updateLiabilityField("electricity", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Water</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.water} onChange={(e) => updateLiabilityField("water", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Gas</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.gas} onChange={(e) => updateLiabilityField("gas", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Internet</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.internet} onChange={(e) => updateLiabilityField("internet", e.target.value)} /></div>
                    </div>
                  )}

                  {liabilityDialog.householdCategory === "Groceries" && (
                    <div className="col-span-2 mt-1">
                      <Label className="text-[9px]">Daily Household Purchases (Total)</Label>
                      <Input type="number" className="h-7 text-xs" value={liabilityDialog.groceries} onChange={(e) => updateLiabilityField("groceries", e.target.value)} />
                    </div>
                  )}

                  {liabilityDialog.householdCategory === "Education" && (
                    <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                      <div><Label className="text-[9px]">Fees</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.fees} onChange={(e) => updateLiabilityField("fees", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Books</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.books} onChange={(e) => updateLiabilityField("books", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Academic Costs</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.academicCosts} onChange={(e) => updateLiabilityField("academicCosts", e.target.value)} /></div>
                    </div>
                  )}

                  {liabilityDialog.householdCategory === "Domestic Services" && (
                    <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                      <div><Label className="text-[9px]">Maid Salary</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.maidSalary} onChange={(e) => updateLiabilityField("maidSalary", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Cook Salary</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.cookSalary} onChange={(e) => updateLiabilityField("cookSalary", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Service Costs</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.serviceCosts} onChange={(e) => updateLiabilityField("serviceCosts", e.target.value)} /></div>
                    </div>
                  )}

                  {liabilityDialog.householdCategory === "Healthcare" && (
                    <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                      <div><Label className="text-[9px]">Medical Bills</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.medicalBills} onChange={(e) => updateLiabilityField("medicalBills", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Medicines</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.medicines} onChange={(e) => updateLiabilityField("medicines", e.target.value)} /></div>
                      <div><Label className="text-[9px]">Misc Costs</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.miscCosts} onChange={(e) => updateLiabilityField("miscCosts", e.target.value)} /></div>
                    </div>
                  )}

                  <div className="col-span-2 mt-2 pt-2 border-t border-dashed">
                    <Label className="text-[10px] font-bold">Total Monthly Amount (₹) {liabilityDialog.householdCategory && <span className="text-primary font-normal">(Calculated)</span>}</Label>
                    <Input type="number" value={liabilityDialog.householdAmount} onChange={(e) => updateLiabilityField("householdAmount", e.target.value)} className="h-8 text-xs font-bold bg-muted" readOnly={!!liabilityDialog.householdCategory} />
                  </div>
                </div>
              )}

              {liabilityDialog.liabilityType !== "Household Obligations" && (
                <div className={(liabilityDialog.liabilityType === "Loans" && liabilityDialog.loanType !== "personal_loan" && liabilityDialog.loanType !== "business_loan") ? "" : "col-span-2"}>
                  <Label className="text-xs">
                    {liabilityDialog.liabilityType === "Taxes" ? "Authority Name" : 
                     liabilityDialog.liabilityType === "Bills" ? "Service Provider" :
                     liabilityDialog.liabilityType === "Insurance Dues" ? "Insurer Name" : "Lender Name"}
                  </Label>
                  <Input value={liabilityDialog.lenderName} onChange={(e) => updateLiabilityField("lenderName", e.target.value)} />
                </div>
              )}
              
              {liabilityDialog.liabilityType !== "Household Obligations" && (
                <>
                  <div>
                    <Label className="text-xs">
                      {liabilityDialog.liabilityType === "Bills" ? "Original Bill Amount" : 
                       liabilityDialog.liabilityType === "Insurance Dues" ? "Projected Value" : "Total Liability Amount"}
                    </Label>
                    <Input type="number" value={liabilityDialog.totalLoanAmount} onChange={(e) => updateLiabilityField("totalLoanAmount", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Outstanding Amount {(liabilityDialog.liabilityType === "Bills" || liabilityDialog.liabilityType === "Insurance Dues") && <span className="text-[10px] text-primary">(Auto-filled)</span>}
                    </Label>
                    <Input type="number" value={liabilityDialog.outstandingAmount} onChange={(e) => updateLiabilityField("outstandingAmount", e.target.value)} />
                  </div>
                </>
              )}
              
              {liabilityDialog.liabilityType !== "Taxes" && liabilityDialog.liabilityType !== "Insurance Dues" && liabilityDialog.liabilityType !== "Household Obligations" && (
                <>
                  <div><Label className="text-xs">{liabilityDialog.liabilityType === "Bills" ? "Late Penalty Rate (%)" : "Interest Rate (%)"}</Label><Input type="number" value={liabilityDialog.interestRate} onChange={(e) => updateLiabilityField("interestRate", e.target.value)} /></div>
                  {liabilityDialog.liabilityType !== "Bills" && (
                    <div><Label className="text-xs">Tenure (Years)</Label><Input type="number" step="0.5" value={liabilityDialog.tenure} onChange={(e) => updateLiabilityField("tenure", e.target.value)} /></div>
                  )}
                  {liabilityDialog.liabilityType !== "Bills" && (
                    <div><Label className="text-xs">EMI / Monthly Payment {liabilityDialog.liabilityType === "Loans" && <span className="text-[10px] text-primary">(Auto-calculated)</span>}</Label><Input type="number" value={liabilityDialog.emi} onChange={(e) => updateLiabilityField("emi", e.target.value)} /></div>
                  )}
                </>
              )}
              
              <div className={liabilityDialog.liabilityType === "Insurance Dues" ? "col-span-2" : ""}>
                <Label className="text-xs">
                  {liabilityDialog.liabilityType === "Taxes" ? "Due Date" : 
                   liabilityDialog.liabilityType === "Bills" ? "Due Date" : "Start Date"}
                </Label>
                <Input type="date" value={liabilityDialog.startDate} onChange={(e) => updateLiabilityField("startDate", e.target.value)} />
              </div>
              
              {liabilityDialog.liabilityType !== "Insurance Dues" && (
                <div>
                  <Label className="text-xs">
                    {liabilityDialog.liabilityType === "Taxes" ? "Maturity Date (Optional)" : "End Date"}
                  </Label>
                  <Input type="date" value={liabilityDialog.endDate} onChange={(e) => updateLiabilityField("endDate", e.target.value)} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiabilityDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveLiability} disabled={createLiability.isPending || updateLiability.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!familyMemberDialog} onOpenChange={(open) => !open && setFamilyMemberDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{familyMemberDialog?.editId ? "Edit Family Member" : "Add Family Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={familyMemberDialog?.name ?? ""} onChange={(e) => setFamilyMemberDialog(prev => prev ? { ...prev, name: e.target.value } : null)} placeholder="Enter name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Relation</Label>
                <Select value={["Parent", "Father", "Mother"].includes(familyMemberDialog?.relation ?? "Child") ? "Parent" : (familyMemberDialog?.relation ?? "Child")} onValueChange={(val: any) => setFamilyMemberDialog(prev => prev ? { ...prev, relation: val } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Child">Child</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>DOB</Label>
                <Input type="date" value={familyMemberDialog?.dob ?? ""} onChange={(e) => setFamilyMemberDialog(prev => prev ? { ...prev, dob: e.target.value } : null)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input value={familyMemberDialog?.phone ?? ""} onChange={(e) => setFamilyMemberDialog(prev => prev ? { ...prev, phone: e.target.value } : null)} placeholder="Enter mobile number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFamilyMemberDialog(null)}>Cancel</Button>
            <Button 
              disabled={createFamilyMember.isPending || updateFamilyMember.isPending}
              onClick={() => {
                if (!familyMemberDialog) return;
                const { name, dob, phone, relation, editId } = familyMemberDialog;
                if (!name || !relation) {
                  alert("Name and Relation are required");
                  return;
                }

                const payload = { 
                  clientId, 
                  data: { 
                    name, 
                    dob: dob || undefined, 
                    phone: phone || undefined, 
                    relation 
                  } 
                };

                if (editId) {
                  updateFamilyMember.mutate({ ...payload, familyMemberId: editId }, {
                    onSuccess: () => { 
                      queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey(clientId) }); 
                      setFamilyMemberDialog(null); 
                    },
                    onError: (err: any) => {
                      alert(`Failed to update member: ${err.message || "Unknown error"}`);
                    }
                  });
                } else {
                  createFamilyMember.mutate(payload, {
                    onSuccess: () => { 
                      queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey(clientId) }); 
                      setFamilyMemberDialog(null); 
                    },
                    onError: (err: any) => {
                      alert(`Failed to create member: ${err.message || "Unknown error"}`);
                    }
                  });
                }
              }}
            >
              {(createFamilyMember.isPending || updateFamilyMember.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
