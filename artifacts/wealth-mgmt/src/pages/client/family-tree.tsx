import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  useGetMe,
  useListFamilyMembers, 
  useCreateFamilyMember, 
  useUpdateFamilyMember, 
  useDeleteFamilyMember,
  useListClientAssets,
  useListClientLiabilities,
  useCreateClientAsset,
  useUpdateClientAsset,
  useDeleteClientAsset,
  useCreateClientLiability,
  useUpdateClientLiability,
  useDeleteClientLiability,
  useGetClientSummary,
  getListFamilyMembersQueryKey,
  getListClientAssetsQueryKey,
  getListClientLiabilitiesQueryKey,
  getGetClientSummaryQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { FamilyTree } from "@/components/family-tree";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Users, Wallet, ArrowUpRight, TrendingDown, Percent, ShieldCheck, Activity, Sparkles, BarChart3, Landmark, RefreshCw, Shield, Coins, Loader2, TrendingUp, Compass, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { FundAutocomplete } from "@/components/fund-autocomplete";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { MutualFundNav, MFProjectionInline } from "@/components/mutual-fund-nav";
import { StockPriceDisplay, StockProjectionInline } from "@/components/stock-price-display";
import { FDValuation, RDValuation, PFValuation, calculateEMI, LoanValuation, calculateIncomeTax, calculatePFCurrentValue, calculateMFCurrentValue, SIPValuation, SWPValuation, STPValuation } from "@/components/fixed-income-valuation";
import { usePageBackground } from "@/hooks/usePageBackground";
import CircularNavigation from "@/components/ui/cicular-navigation-bar";
import { useMFNav } from "@/hooks/use-mf-nav";
import { useStockPrice } from "@/hooks/use-stock-price";
import { getFundCode } from "@/lib/mutual-funds";
import { getStockSymbol } from "@/lib/stocks";

const ASSET_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Fund", stock: "Stock", fixed_deposit: "Fixed Deposit",
  recurring_deposit: "Recurring Deposit", provident_fund: "Provident Fund", cash_bank: "Cash & Bank",
};

const LOAN_LABELS: Record<string, string> = {
  home_loan: "Home Loan", car_loan: "Car Loan", personal_loan: "Personal Loan",
  education_loan: "Education Loan", business_loan: "Business Loan", other: "Other",
};

const ASSET_TYPES = [
  { value: "mutual_fund", label: "Mutual Fund" }, { value: "stock", label: "Stock" },
  { value: "fixed_deposit", label: "Fixed Deposit (FD)" }, { value: "recurring_deposit", label: "Recurring Deposit (RD)" },
  { value: "provident_fund", label: "Provident Fund (PPF/EPF)" }, { value: "cash_bank", label: "Cash / Bank Balance" },
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
  { label: "Electricity bill", value: "Electricity bill" }, { label: "Water bill", value: "Water bill" }, { label: "Internet bill", value: "Internet bill" },
];

const INSURANCE_CATEGORIES = [
  { label: "Life Insurance", value: "Life Insurance" }, { label: "Health Insurance", value: "Health Insurance" },
  { label: "Vehicle Insurance", value: "Vehicle Insurance" }, { label: "Home Insurance", value: "Home Insurance" },
  { label: "Travel Insurance", value: "Travel Insurance" },
];

const LIFE_INSURANCE_SUBTYPES = [
  { label: "Term Insurance", value: "Term Insurance" }, { label: "ULIP / Investment-linked", value: "ULIP" },
];

const VEHICLE_INSURANCE_SUBTYPES = [
  { label: "Car", value: "Car" }, { label: "Bike", value: "Bike" }, { label: "Scooty", value: "Scooty" },
];

const BUSINESS_LOAN_TYPES = [
  { value: "Term Loan", label: "Term Loan" }, { value: "Working Capital/ OD", label: "Working Capital/ OD" }, { value: "Bullet Loan", label: "Bullet Loan" },
];

const HOUSEHOLD_CATEGORIES = [
  { value: "Housing", label: "Housing (Rent, Maint, Taxes)" }, { value: "Utilities", label: "Utilities (Elec, Water, Gas, Net)" },
  { value: "Groceries", label: "Groceries & Daily Needs" }, { value: "Education", label: "Education (Fees, Books)" },
  { value: "Domestic Services", label: "Domestic Services (Maid, Cook)" }, { value: "Healthcare", label: "Healthcare & Misc" },
];

type AssetDialogData = { type: string; data: Record<string, string>; editId?: number; };
type LiabilityDialogData = {
  liabilityType: string; loanType: string; lenderName: string; totalLoanAmount: string; outstandingAmount: string;
  interestRate: string; emi: string; startDate: string; endDate: string; interestType: string; subType: string; tenure: string;
  income: string; tds: string; advanceTax: string; standardDeduction: string; editId?: number;
  insuranceCategory: string; insuranceSubtype: string; propertyValue: string; insuranceRate: string; premium: string;
  tenureYears: string; baseRate: string; addOns: string; discounts: string;
  householdCategory: string; householdAmount: string; rent: string; maintenance: string; taxes: string;
  electricity: string; water: string; gas: string; internet: string; groceries: string;
  fees: string; books: string; academicCosts: string; maidSalary: string; cookSalary: string; serviceCosts: string;
  medicalBills: string; medicines: string; miscCosts: string;
};

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

const ASSET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mutual_fund: TrendingUp,
  stock: BarChart3,
  fixed_deposit: Landmark,
  recurring_deposit: RefreshCw,
  provident_fund: Shield,
  cash_bank: Coins,
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
  
  const staticVals = getAssetCurrentAndInvested(item);
  const [resolvedVals, setResolvedVals] = useState(staticVals);

  const isMFLumpSum = item.assetType === "mutual_fund" && (!investmentMethod || investmentMethod === "Lump sum");
  const mfSchemeCode = isMFLumpSum && assetName ? getFundCode(assetName) : null;
  const { data: mfData } = useMFNav(mfSchemeCode ?? "");

  const isStock = item.assetType === "stock";
  const stockSymbol = isStock && assetName ? getStockSymbol(assetName) : null;
  const { data: stockData } = useStockPrice(stockSymbol ?? "");

  useEffect(() => {
    if (isMFLumpSum && mfData?.nav !== undefined) {
      const current = units * mfData.nav;
      setResolvedVals({ invested: staticVals.invested, current });
      onResolved(item.id, current, staticVals.invested);
    }
  }, [mfData?.nav, isMFLumpSum, units, staticVals.invested, item.id, onResolved]);

  useEffect(() => {
    if (isStock && stockData?.price !== undefined) {
      const current = units * stockData.price;
      setResolvedVals({ invested: staticVals.invested, current });
      onResolved(item.id, current, staticVals.invested);
    }
  }, [stockData?.price, isStock, units, staticVals.invested, item.id, onResolved]);

  const vals = resolvedVals;
  const weight = totals.current > 0 ? (vals.current / totals.current) * 100 : 0;
  const gain = vals.current - vals.invested;
  const gainPct = vals.invested > 0 ? (gain / vals.invested) * 100 : 0;
  const isPositive = gain >= 0;

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
          <button className="flex items-center gap-2 w-full justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm group cursor-pointer">
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
          <button className="flex items-center gap-2 w-full justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm group cursor-pointer">
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
          <button className="flex items-center gap-2 w-full justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm group cursor-pointer">
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
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-snug truncate" title={assetName}>{assetName}</p>
          {investmentMethod && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {investmentMethod}
            </span>
          )}
        </div>
        <div className={`flex-shrink-0 text-right rounded-xl px-3 py-1.5 ${isPositive ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Total Return</p>
          <p className={`text-sm font-black tabular-nums ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isPositive ? '+' : ''}{gainPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Amount Invested</p>
          <p className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(vals.invested)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Current Value</p>
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

      {projectionNode && (
        <div className="px-4 pb-4 pt-3">
          {projectionNode}
        </div>
      )}
    </div>
  );
}

export default function ClientFamilyTreePage() {
  const { data: user } = useGetMe({ query: { retry: false, queryKey: ["me"] } as any });
  const clientId = user?.clientId;
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const assetsRef = useRef<HTMLDivElement>(null);
  const [activeAssetTab, setActiveAssetTab] = useState(0);
  const [isCircularNavOpen, setIsCircularNavOpen] = useState(false);
  const [viewHoldingsForType, setViewHoldingsForType] = useState<string | null>(null);
  const [assetCurrentPage, setAssetCurrentPage] = useState(1);
  const [liveValues, setLiveValues] = useState<Record<number, { current: number; invested: number }>>({});
  const [activeMainTab, setActiveMainTab] = useState<"assets" | "liabilities">("assets");
  const [mainAssetsPage, setMainAssetsPage] = useState(1);
  const [mainLiabilitiesPage, setMainLiabilitiesPage] = useState(1);
  
  const handleLiveValueResolved = useCallback((id: number, current: number, invested: number) => {
    setLiveValues(prev => {
      if (prev[id]?.invested === invested && prev[id]?.current === current) return prev;
      return { ...prev, [id]: { current, invested } };
    });
  }, []);
  
  const scrollToFamilyTree = () => {
    document.getElementById('family-tree-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  usePageBackground('light');

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

  const { data: familyMembers } = useListFamilyMembers(clientId!, { query: { enabled: !!clientId, queryKey: getListFamilyMembersQueryKey(clientId!) } as any });
  const { data: summary } = useGetClientSummary(clientId!, { query: { enabled: !!clientId, queryKey: getGetClientSummaryQueryKey(clientId!) } as any });
  const { data: assets } = useListClientAssets(clientId!, { query: { enabled: !!clientId, queryKey: getListClientAssetsQueryKey(clientId!) } as any });
  const { data: liabilities } = useListClientLiabilities(clientId!, { query: { enabled: !!clientId, queryKey: getListClientLiabilitiesQueryKey(clientId!) } as any });

  const createFamilyMember = useCreateFamilyMember();
  const updateFamilyMember = useUpdateFamilyMember();
  const deleteFamilyMember = useDeleteFamilyMember();
  const createAsset = useCreateClientAsset();
  const updateAssetMutation = useUpdateClientAsset();
  const deleteAsset = useDeleteClientAsset();
  const createLiability = useCreateClientLiability();
  const updateLiability = useUpdateClientLiability();
  const deleteLiability = useDeleteClientLiability();

  const [memberDialog, setMemberDialog] = useState<{ name: string; relation: string; dob: string; phone: string; editId?: number } | null>(null);
  const [assetDialog, setAssetDialog] = useState<AssetDialogData | null>(null);
  const [liabilityDialog, setLiabilityDialog] = useState<LiabilityDialogData | null>(null);

  const getDisplayValue = (asset: any) => {
    if (asset.assetType === "provident_fund") return calculatePFCurrentValue(asset.data as Record<string, any>).currentValue;
    if ((asset.data as any).investmentMethod && (asset.data as any).investmentMethod !== "Lump sum") return calculateMFCurrentValue(asset.data);
    if (asset.value > 0) return asset.value;
    if ((asset.data as any).amount) return parseFloat((asset.data as any).amount);
    if ((asset.data as any).investmentAmount) return parseFloat((asset.data as any).investmentAmount);
    return 0;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey(clientId!) });
    queryClient.invalidateQueries({ queryKey: getListClientAssetsQueryKey(clientId!) });
    queryClient.invalidateQueries({ queryKey: getListClientLiabilitiesQueryKey(clientId!) });
    queryClient.invalidateQueries({ queryKey: getGetClientSummaryQueryKey(clientId!) });
  };

  const updateAssetField = (key: string, value: string) => {
    if (!assetDialog) return;
    const data = { ...assetDialog.data, [key]: value };
    if (key === "units" || key === "price") {
      const units = parseFloat((key === "units" ? value : data.units) || "0");
      const price = parseFloat((key === "price" ? value : data.price) || "0");
      data.amount = (units * price).toFixed(2);
    }
    if (key === "age" && assetDialog.type === "provident_fund" && data.accountType === "EPF") {
      const ageNum = parseInt(value);
      if (!isNaN(ageNum)) {
        data.tenureYears = String(60 - ageNum);
      }
    }
    setAssetDialog({ ...assetDialog, data });
  };

  const updateLiabilityField = (key: string, value: string) => {
    if (!liabilityDialog) return;
    const newData = { ...liabilityDialog, [key]: value };
    if ((newData.liabilityType === "Loans" || newData.liabilityType === "Credit Cards & BNPL" || newData.liabilityType === "EMIs") && (key === "totalLoanAmount" || key === "interestRate" || key === "startDate" || key === "endDate" || key === "interestType" || key === "subType" || key === "tenure")) {
      if (key === "tenure" && newData.startDate && newData.tenure) {
        const start = new Date(newData.startDate); const years = parseFloat(newData.tenure) || 0;
        const end = new Date(start); end.setFullYear(start.getFullYear() + Math.floor(years)); end.setMonth(start.getMonth() + Math.round((years % 1) * 12));
        newData.endDate = end.toISOString().split("T")[0];
      } else if ((key === "startDate" || key === "endDate") && newData.startDate && newData.endDate) {
        const start = new Date(newData.startDate); const end = new Date(newData.endDate);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        newData.tenure = (months / 12).toFixed(1);
      }
      const P = (newData.subType === "Working Capital/ OD") ? (parseFloat(newData.outstandingAmount) || parseFloat(newData.totalLoanAmount) || 0) : (parseFloat(newData.totalLoanAmount) || 0);
      const R = parseFloat(newData.interestRate) || 0;
      if (P > 0 && R > 0) {
        if (newData.subType === "Working Capital/ OD" || newData.subType === "Bullet Loan") newData.emi = calculateEMI(P, R, 1, false, newData.subType).toFixed(2);
        else if (newData.startDate && newData.endDate) {
          const start = new Date(newData.startDate); const end = new Date(newData.endDate);
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          if (months > 0) newData.emi = calculateEMI(P, R, months, newData.interestType === "Flat", newData.subType).toFixed(2);
        }
      }
    } else if (newData.liabilityType === "Taxes") {
      const inc = parseFloat(newData.income) || 0; const t = parseFloat(newData.tds) || 0; const adv = parseFloat(newData.advanceTax) || 0; const std = parseFloat(newData.standardDeduction) || 75000;
      if (inc > 0) {
        const grossTaxPlusCess = calculateIncomeTax(inc, std); const netTax = Math.max(0, grossTaxPlusCess - t - adv);
        newData.totalLoanAmount = netTax.toFixed(2); newData.outstandingAmount = netTax.toFixed(2);
      }
    } else if (newData.liabilityType === "Bills") {
      const P = parseFloat(newData.totalLoanAmount) || 0; const r = (parseFloat(newData.interestRate) || 0) / 100;
      if (P > 0 && newData.startDate) {
        const due = new Date(newData.startDate); const now = new Date();
        if (now > due) {
          const t = (now.getFullYear() - due.getFullYear()) * 12 + (now.getMonth() - due.getMonth());
          if (t > 0) newData.outstandingAmount = (P * Math.pow(1 + r, t)).toFixed(2); else newData.outstandingAmount = P.toFixed(2);
        } else newData.outstandingAmount = P.toFixed(2);
      }
    } else if (newData.liabilityType === "Insurance Dues") {
      const cat = newData.insuranceCategory; const sub = newData.insuranceSubtype;
      if (cat === "Vehicle Insurance" && (key === "baseRate" || key === "addOns" || key === "discounts")) {
        const base = parseFloat(key === "baseRate" ? value : newData.baseRate) || 0;
        const add = parseFloat(key === "addOns" ? value : newData.addOns) || 0;
        const disc = parseFloat(key === "discounts" ? value : newData.discounts) || 0;
        newData.premium = (base + add - disc).toFixed(2);
      }
      const prem = parseFloat(newData.premium) || 0; const yrs = parseFloat(newData.tenureYears) || 0; const rate = (parseFloat(newData.interestRate) || 0) / 100; const propVal = parseFloat(newData.propertyValue) || 0;
      if (cat === "Life Insurance") {
        if (sub === "Term Insurance") newData.totalLoanAmount = (prem * yrs).toFixed(2);
        else if (sub === "ULIP") newData.totalLoanAmount = (prem * Math.pow(1 + rate, yrs)).toFixed(2);
      } else if (cat === "Health Insurance") newData.totalLoanAmount = (prem * yrs).toFixed(2);
      else if (cat === "Vehicle Insurance" || cat === "Travel Insurance") newData.totalLoanAmount = prem.toFixed(2);
      else if (cat === "Home Insurance") newData.totalLoanAmount = (propVal * rate).toFixed(2);
      newData.outstandingAmount = newData.totalLoanAmount;
    } else if (newData.liabilityType === "Household Obligations") {
      let total = 0;
      if (newData.householdCategory === "Housing") total = (parseFloat(newData.rent) || 0) + (parseFloat(newData.maintenance) || 0) + (parseFloat(newData.taxes) || 0);
      else if (newData.householdCategory === "Utilities") total = (parseFloat(newData.electricity) || 0) + (parseFloat(newData.water) || 0) + (parseFloat(newData.gas) || 0) + (parseFloat(newData.internet) || 0);
      else if (newData.householdCategory === "Groceries") total = parseFloat(newData.groceries) || 0;
      else if (newData.householdCategory === "Education") total = (parseFloat(newData.fees) || 0) + (parseFloat(newData.books) || 0) + (parseFloat(newData.academicCosts) || 0);
      else if (newData.householdCategory === "Domestic Services") total = (parseFloat(newData.maidSalary) || 0) + (parseFloat(newData.cookSalary) || 0) + (parseFloat(newData.serviceCosts) || 0);
      else if (newData.householdCategory === "Healthcare") total = (parseFloat(newData.medicalBills) || 0) + (parseFloat(newData.medicines) || 0) + (parseFloat(newData.miscCosts) || 0);
      newData.householdAmount = total.toFixed(2); newData.totalLoanAmount = total.toFixed(2); newData.outstandingAmount = total.toFixed(2);
    }
    setLiabilityDialog(newData);
  };

  const handleSaveLiability = async () => {
    if (!liabilityDialog || !clientId) return;
    const payload: any = {
      loanType: liabilityDialog.loanType as any, lenderName: liabilityDialog.lenderName, totalLoanAmount: parseFloat(liabilityDialog.totalLoanAmount || "0"), outstandingAmount: parseFloat(liabilityDialog.outstandingAmount || "0"),
      interestRate: parseFloat(liabilityDialog.interestRate || "0"), emi: parseFloat(liabilityDialog.emi || "0"), startDate: liabilityDialog.startDate || undefined, endDate: liabilityDialog.endDate || undefined,
      familyMemberId: selectedMemberId,
      notes: liabilityDialog.liabilityType === "Taxes" ? `Taxes|Income:${liabilityDialog.income}|TDS:${liabilityDialog.tds}|Advance:${liabilityDialog.advanceTax}|StdDed:${liabilityDialog.standardDeduction}` :
             liabilityDialog.liabilityType === "Bills" ? `Bills|${liabilityDialog.subType}` :
             liabilityDialog.liabilityType === "Insurance Dues" ? `Insurance Dues|Cat:${liabilityDialog.insuranceCategory}${(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Vehicle Insurance") && liabilityDialog.insuranceSubtype ? `|Sub:${liabilityDialog.insuranceSubtype}` : ""}|Premium:${liabilityDialog.premium}|Years:${liabilityDialog.tenureYears}|Base:${liabilityDialog.baseRate}|Addons:${liabilityDialog.addOns}|Disc:${liabilityDialog.discounts}` :
             liabilityDialog.liabilityType === "Household Obligations" ? `Household Obligations|Cat:${liabilityDialog.householdCategory}|Amt:${liabilityDialog.householdAmount}${liabilityDialog.householdCategory === "Housing" ? `|Rent:${liabilityDialog.rent}|Maint:${liabilityDialog.maintenance}|Taxes:${liabilityDialog.taxes}` : liabilityDialog.householdCategory === "Utilities" ? `|Elec:${liabilityDialog.electricity}|Water:${liabilityDialog.water}|Gas:${liabilityDialog.gas}|Net:${liabilityDialog.internet}` : liabilityDialog.householdCategory === "Education" ? `|Fees:${liabilityDialog.fees}|Books:${liabilityDialog.books}|Acad:${liabilityDialog.academicCosts}` : liabilityDialog.householdCategory === "Domestic Services" ? `|Maid:${liabilityDialog.maidSalary}|Cook:${liabilityDialog.cookSalary}|Serv:${liabilityDialog.serviceCosts}` : liabilityDialog.householdCategory === "Healthcare" ? `|MedB:${liabilityDialog.medicalBills}|MedI:${liabilityDialog.medicines}|Misc:${liabilityDialog.miscCosts}` : ""}` :
             `${liabilityDialog.liabilityType}${liabilityDialog.interestType === "Flat" ? "|Flat" : ""}${liabilityDialog.subType ? `|${liabilityDialog.subType}` : ""}`,
    };
    if (liabilityDialog.editId) await updateLiability.mutateAsync({ clientId, liabilityId: liabilityDialog.editId, data: payload });
    else await createLiability.mutateAsync({ clientId, data: payload });
    setLiabilityDialog(null); invalidate();
  };

  const filteredAssets = assets?.filter(a => (a.familyMemberId ?? null) === (selectedMemberId ?? null)) ?? [];
  const filteredLiabilities = liabilities?.filter(l => (l.familyMemberId ?? null) === (selectedMemberId ?? null)) ?? [];

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

  if (viewHoldingsForType !== null && clientId) {
    const activeGroup = groups.find(g => g.typeKey === viewHoldingsForType);
    if (activeGroup) {
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
          <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in" data-reveal>
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
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Lineage Explorer</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-[10px] uppercase tracking-widest text-indigo-500 font-extrabold">
                      {selectedMemberId ? familyMembers?.find(m => m.id === selectedMemberId)?.name : user?.name}
                    </span>
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
                Back to Lineage Explorer
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

              <Button 
                onClick={() => { setAssetDialog({ type: activeGroup.typeKey, data: {} }); }}
                className={`bg-gradient-to-r ${activeGroup.meta.gradient} hover:opacity-90 text-slate-955 font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer`}
              >
                <Plus className="h-4 w-4" /> Add New Holding
              </Button>
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
                            onClick={() => { if(confirm("Delete asset?")) deleteAsset.mutateAsync({ clientId: clientId!, assetId: asset.id }).then(invalidate); }}
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
                                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold mb-1">{labelMap[k] ?? k.replace(/([A-Z])/g, " $1")}</p>
                                <p className="text-xs font-bold text-slate-800 tabular-nums truncate">{formatValue(k, v)}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Projections or Valuations inline */}
                      {asset.assetType === "mutual_fund" && (asset.data as any).assetName && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          {!(asset.data as any).investmentMethod || (asset.data as any).investmentMethod === "Lump sum" ? (
                            <MFProjectionInline
                              fundName={(asset.data as any).assetName}
                              units={parseFloat((asset.data as any).units ?? "0")}
                              investmentAmount={parseFloat((asset.data as any).amount ?? "0")}
                              investmentMethod={(asset.data as any).investmentMethod}
                              assetData={asset.data}
                            />
                          ) : (asset.data as any).investmentMethod === "SIP" ? (
                            <SIPValuation data={asset.data} />
                          ) : (asset.data as any).investmentMethod === "SWP" ? (
                            <SWPValuation data={asset.data} />
                          ) : (asset.data as any).investmentMethod === "STP" ? (
                            <STPValuation data={asset.data} />
                          ) : null}
                        </div>
                      )}
                      {asset.assetType === "stock" && (asset.data as any).assetName && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <StockProjectionInline
                            stockName={(asset.data as any).assetName}
                            units={parseFloat((asset.data as any).units ?? "0")}
                            investmentAmount={parseFloat((asset.data as any).amount ?? "0")}
                          />
                        </div>
                      )}
                      {asset.assetType === "fixed_deposit" && (
                        <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <FDValuation data={asset.data as any} />
                        </div>
                      )}
                      {asset.assetType === "recurring_deposit" && (
                        <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <RDValuation data={asset.data as any} />
                        </div>
                      )}
                      {asset.assetType === "provident_fund" && (
                        <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <PFValuation data={asset.data as any} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
                  <span className="font-bold text-slate-900">{Math.min(startIndex + itemsPerPage, sortedHoldings.length)}</span> of{" "}
                  <span className="font-bold text-slate-900">{sortedHoldings.length}</span> holdings
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activePage === 1}
                    onClick={() => setAssetCurrentPage(activePage - 1)}
                    className="rounded-xl border-slate-200"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activePage === totalPages}
                    onClick={() => setAssetCurrentPage(activePage + 1)}
                    className="rounded-xl border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Layout>
      );
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Bloomberg-grade Family Office Hub Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-slate-800 p-8 md:p-10 shadow-2xl text-white">
          {/* Subtle Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wider uppercase animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5" /> Multi-Generational wealth
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Legacy & <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">Lineage</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
                Seamlessly visualize family lineage, allocate multi-generational assets, and manage consolidated household liabilities in real-time.
              </p>
            </div>

            {/* Premium Metrics Ribbon - Full Width Stacked */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-inner w-full">
              
              {/* Active Members */}
              <div className="flex flex-col justify-between md:border-r border-slate-800/80 last:border-0 pr-4">
                <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase flex items-center gap-1.5"><Users className="w-3 h-3 text-indigo-400" /> Lineage</span>
                <div className="mt-3">
                  <p className="text-2xl md:text-3xl font-black text-white">{(familyMembers?.length ?? 0) + 1}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Tracked Members</p>
                </div>
              </div>

              {/* Total Assets */}
              <div className="flex flex-col justify-between md:border-r border-slate-800/80 last:border-0 px-2 md:px-4">
                <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase flex items-center gap-1.5"><Wallet className="w-3 h-3 text-emerald-400" /> Assets</span>
                <div className="mt-3">
                  <p className="text-xl md:text-2xl xl:text-3xl font-black text-emerald-400 whitespace-nowrap">{formatCurrency(summary?.totalAssets ?? 0)}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Invested Value</p>
                </div>
              </div>

              {/* Liabilities */}
              <div className="flex flex-col justify-between md:border-r border-slate-800/80 last:border-0 px-2 md:px-4">
                <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase flex items-center gap-1.5"><TrendingDown className="w-3 h-3 text-rose-400" /> Leverage</span>
                <div className="mt-3">
                  <p className="text-xl md:text-2xl xl:text-3xl font-black text-rose-400 whitespace-nowrap">{formatCurrency(summary?.totalLiabilities ?? 0)}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Active Debts</p>
                </div>
              </div>

              {/* Consolidated Net Worth */}
              <div className="flex flex-col justify-between px-2 md:pl-4">
                <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-indigo-300" /> Net Worth</span>
                <div className="mt-3">
                  <p className="text-xl md:text-2xl xl:text-3xl font-black text-white bg-gradient-to-r from-indigo-300 to-cyan-200 bg-clip-text text-transparent whitespace-nowrap">{formatCurrency(summary?.netWorth ?? 0)}</p>
                  <p className="text-[10px] text-indigo-300 mt-1 font-black">Consolidated</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Tree Header and Trigger Action Row */}
        <div id="family-tree-section" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 scroll-mt-20 border-b border-slate-100 pb-4" data-reveal>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 animate-pulse" /> Lineage Explorer
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Double-click to pan • Click node to filter assets & liabilities
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-300 animate-in fade-in" 
              onClick={() => setMemberDialog({ name: "", relation: "Child", dob: "", phone: "" })}
            >
              <Plus className="h-4.5 w-4.5" /> Add Family Member
            </Button>
          </div>
        </div>

        <div data-reveal data-reveal-delay="200">
          <FamilyTree 
            client={{ id: clientId!, name: user?.name ?? "Me" }}
            familyMembers={familyMembers ?? []}
            assets={assets ?? []}
            liabilities={liabilities ?? []}
          selectedMemberId={selectedMemberId}
          onSelectMember={(m) => {
            setSelectedMemberId(m?.id ?? null);
            setMainAssetsPage(1);
            setMainLiabilitiesPage(1);
            setTimeout(() => {
              assetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
          onAddMember={(rel) => setMemberDialog({ name: "", relation: rel || "Child", dob: "", phone: "" })}
          onEditMember={(m) => setMemberDialog({ name: m.name, relation: m.relation as any, dob: m.dob || "", phone: m.phone || "", editId: m.id })}
          onDeleteMember={(id) => {
            if (confirm("Delete this family member? This will also remove their assets and liabilities.")) {
              deleteFamilyMember.mutateAsync({ clientId: clientId!, familyMemberId: id }).then(invalidate);
            }
          }}
        />

        <div ref={assetsRef} className="mt-12 animate-in fade-in slide-in-from-bottom-6 duration-500" data-reveal data-reveal-delay="400">
          
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

          {activeMainTab === "assets" ? (
            /* Assets Section */
            <div className="space-y-6 animate-in fade-in duration-300">
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
                <Button size="sm" className="gap-2 bg-slate-955 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-slate-955/20 cursor-pointer" onClick={() => { setAssetDialog({ type: "mutual_fund", data: {} }); }}>
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

                const groups = ASSET_TYPES
                  .map(t => ({
                    typeKey: t.value,
                    meta: GROUP_META[t.value] ?? { label: t.label, plural: t.label, gradient: "from-slate-400 to-slate-300", badgeCls: "bg-slate-100 text-slate-600 border-slate-200", color: "#94a3b8", icon: "💼" },
                    items: filteredAssets.filter(a => a.assetType === t.value),
                  }))
                  .filter(g => g.items.length > 0);

                if (groups.length === 0) return (
                  <Card className="border-slate-200 border-dashed bg-slate-50/50 rounded-[2rem] overflow-hidden">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <Plus className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-semibold">No assets recorded yet</p>
                      <p className="text-slate-400 text-sm mt-1">Add your first asset to get started</p>
                    </CardContent>
                  </Card>
                );

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
                    {/* Premium Navigation Switcher */}
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

                    {/* Summary card and breakdown visualizer */}
                    <Card className="overflow-hidden border border-slate-200 bg-white shadow-md rounded-[2rem]">
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

                              {/* Breakdown visualization progress list */}
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
              <div id="liabilities-section" className="flex items-center justify-between border-b border-slate-100 pb-3 scroll-mt-20">
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  {selectedMemberId ? familyMembers?.find(m => m.id === selectedMemberId)?.name : "My"} Liabilities
                </h2>
                <Button size="sm" variant="destructive" className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20 hover:-translate-y-0.5 transition-all duration-300" onClick={() => setLiabilityDialog({ liabilityType: "Loans", loanType: "home_loan", lenderName: "", totalLoanAmount: "", outstandingAmount: "", interestRate: "", emi: "", startDate: "", endDate: "", interestType: "Reducing", subType: "", tenure: "", income: "", tds: "", advanceTax: "", standardDeduction: "75000", insuranceCategory: "", insuranceSubtype: "", propertyValue: "", insuranceRate: "", premium: "", tenureYears: "", baseRate: "", addOns: "", discounts: "", householdCategory: "", householdAmount: "", rent: "", maintenance: "", taxes: "", electricity: "", water: "", gas: "", internet: "", groceries: "", fees: "", books: "", academicCosts: "", maidSalary: "", cookSalary: "", serviceCosts: "", medicalBills: "", medicines: "", miscCosts: "" })}>
                  <Plus className="h-4 w-4" /> Add Liability
                </Button>
              </div>
              
              <Card className="glass-panel border-slate-200 bg-white/40 shadow-inner rounded-[2rem] overflow-hidden">
                <CardContent className="space-y-4 pt-6">
                  {(() => {
                    const sortedLiabilities = [...filteredLiabilities].sort((a, b) => b.id - a.id);
                    const itemsPerPage = 10;
                    const totalLiabilitiesPages = Math.max(1, Math.ceil(sortedLiabilities.length / itemsPerPage));
                    const activePage = Math.min(mainLiabilitiesPage, totalLiabilitiesPages);
                    const paginatedLiabilities = sortedLiabilities.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

                    if (paginatedLiabilities.length === 0) {
                      return <p className="text-sm text-slate-400 py-8 text-center italic">No liabilities recorded for this family member</p>;
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4">
                          {paginatedLiabilities.map((liability) => (
                            <div key={liability.id} className="p-5 rounded-3xl border border-slate-100 bg-white/90 hover:bg-white hover:border-rose-500/20 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 group relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 rounded-r-full" />
                              
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <Badge variant="destructive" className="text-[9px] md:text-[10px] bg-rose-50 text-rose-600 border-rose-100 uppercase tracking-wider font-bold">
                                      {(() => { const parts = liability.notes?.split("|") ?? []; const type = parts[0]; const subType = parts[parts.length - 1]; if (type === "Loans") return LOAN_LABELS[liability.loanType]; if (type === "Bills" && subType && subType !== "Bills") return `Bills - ${subType}`; if (type === "Insurance Dues") { const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1]; const sub = parts.find(p => p.startsWith("Sub:"))?.split(":")[1]; return sub ? `${cat} - ${sub}` : (cat ?? "Insurance"); } return type || LOAN_LABELS[liability.loanType]; })()}
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-sm font-black text-slate-900 truncate">{liability.lenderName}</p>
                                  
                                  <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Total Liability</span><span className="text-slate-700 font-semibold">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Outstanding</span><span className="text-rose-600 font-bold">{formatCurrency(liability.outstandingAmount)}</span></p>
                                    <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Rate</span><span className="text-slate-700 font-semibold">{liability.interestRate}%</span></p>
                                    <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">EMI</span><span className="text-slate-900 font-bold">{formatCurrency(liability.emi)}</span></p>
                                  </div>
                                  <LoanValuation liability={liability} />
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 shadow-sm border border-slate-100" onClick={() => { 
                                      const parts = liability.notes?.split("|") ?? []; 
                                      const start = liability.startDate ? new Date(liability.startDate) : null; 
                                      const end = liability.endDate ? new Date(liability.endDate) : null; 
                                      const months = (start && end) ? (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) : 0; 
                                      setLiabilityDialog({ loanType: liability.loanType, liabilityType: parts[0] ?? "Loans", interestType: liability.notes?.includes("|Flat") ? "Flat" : "Reducing", subType: parts.length > 1 && parts[parts.length-1] !== "Flat" ? parts[parts.length-1] : "", lenderName: liability.lenderName, totalLoanAmount: String(liability.totalLoanAmount), outstandingAmount: String(liability.outstandingAmount), interestRate: String(liability.interestRate), emi: String(liability.emi), startDate: liability.startDate ?? "", endDate: liability.endDate ?? "", tenure: months > 0 ? (months / 12).toFixed(1) : "", income: parts.find((p: string) => p.startsWith("Income:"))?.split(":")[1] ?? "", tds: parts.find((p: string) => p.startsWith("TDS:"))?.split(":")[1] ?? "", advanceTax: parts.find((p: string) => p.startsWith("Advance:"))?.split(":")[1] ?? "", standardDeduction: parts.find((p: string) => p.startsWith("StdDed:"))?.split(":")[1] ?? "75000", insuranceCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "", insuranceSubtype: parts.find((p: string) => p.startsWith("Sub:"))?.split(":")[1] ?? "", propertyValue: "", insuranceRate: "", premium: parts.find((p: string) => p.startsWith("Premium:"))?.split(":")[1] ?? "", tenureYears: parts.find((p: string) => p.startsWith("Years:"))?.split(":")[1] ?? "", baseRate: parts.find((p: string) => p.startsWith("Base:"))?.split(":")[1] ?? "", addOns: parts.find((p: string) => p.startsWith("Addons:"))?.split(":")[1] ?? "", discounts: parts.find((p: string) => p.startsWith("Disc:"))?.split(":")[1] ?? "", householdCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "", householdAmount: parts.find((p: string) => p.startsWith("Amt:"))?.split(":")[1] ?? "", rent: parts.find((p: string) => p.startsWith("Rent:"))?.split(":")[1] ?? "", maintenance: parts.find((p: string) => p.startsWith("Maint:"))?.split(":")[1] ?? "", taxes: parts.find((p: string) => p.startsWith("Taxes:"))?.split(":")[1] ?? "", electricity: parts.find((p: string) => p.startsWith("Elec:"))?.split(":")[1] ?? "", water: parts.find((p: string) => p.startsWith("Water:"))?.split(":")[1] ?? "", gas: parts.find((p: string) => p.startsWith("Gas:"))?.split(":")[1] ?? "", internet: parts.find((p: string) => p.startsWith("Net:"))?.split(":")[1] ?? "", groceries: parts.find((p: string) => p.startsWith("Groc:"))?.split(":")[1] ?? "", fees: parts.find((p: string) => p.startsWith("Fees:"))?.split(":")[1] ?? "", books: parts.find((p: string) => p.startsWith("Books:"))?.split(":")[1] ?? "", academicCosts: parts.find((p: string) => p.startsWith("Acad:"))?.split(":")[1] ?? "", maidSalary: parts.find((p: string) => p.startsWith("Maid:"))?.split(":")[1] ?? "", cookSalary: parts.find((p: string) => p.startsWith("Cook:"))?.split(":")[1] ?? "", serviceCosts: parts.find((p: string) => p.startsWith("Serv:"))?.split(":")[1] ?? "", medicalBills: parts.find((p: string) => p.startsWith("MedB:"))?.split(":")[1] ?? "", medicines: parts.find((p: string) => p.startsWith("MedI:"))?.split(":")[1] ?? "", miscCosts: parts.find((p: string) => p.startsWith("Misc:"))?.split(":")[1] ?? "", editId: liability.id }); 
                                    }}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-slate-100" onClick={() => { if(confirm("Delete liability?")) deleteLiability.mutateAsync({ clientId: clientId!, liabilityId: liability.id }).then(invalidate); }}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

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
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>

      <Dialog open={!!memberDialog} onOpenChange={(open) => !open && setMemberDialog(null)}>
        <DialogContent className="bg-white border-slate-200"><DialogHeader><DialogTitle className="text-slate-900">{memberDialog?.editId ? "Edit Family Member" : "Add Family Member"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">{memberDialog && (<><div className="space-y-2"><Label className="text-slate-700">Name</Label><Input value={memberDialog.name} className="bg-white border-slate-200 text-slate-900" onChange={(e) => setMemberDialog({ ...memberDialog, name: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-slate-700">Relation</Label><Select value={["Parent", "Father", "Mother"].includes(memberDialog.relation) ? "Parent" : memberDialog.relation} onValueChange={(val: any) => setMemberDialog({ ...memberDialog, relation: val })}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200"><SelectItem value="Parent">Parent</SelectItem><SelectItem value="Spouse">Spouse</SelectItem><SelectItem value="Child">Child</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label className="text-slate-700">DOB</Label><Input type="date" value={memberDialog.dob} className="bg-white border-slate-200 text-slate-900" onChange={(e) => setMemberDialog({ ...memberDialog, dob: e.target.value })} /></div></div><div className="space-y-2"><Label className="text-slate-700">Mobile Number</Label><Input value={memberDialog.phone} className="bg-white border-slate-200 text-slate-900" onChange={(e) => setMemberDialog({ ...memberDialog, phone: e.target.value })} /></div></>)}</div>
        <DialogFooter><Button variant="outline" className="border-slate-200" onClick={() => setMemberDialog(null)}>Cancel</Button><Button onClick={() => { if (!memberDialog) return; const payload = { name: memberDialog.name, relation: (["Parent", "Father", "Mother"].includes(memberDialog.relation) ? "Parent" : memberDialog.relation) as any, dob: memberDialog.dob || undefined, phone: memberDialog.phone || undefined }; if (memberDialog.editId) updateFamilyMember.mutateAsync({ clientId: clientId!, familyMemberId: memberDialog.editId, data: payload }).then(() => { invalidate(); setMemberDialog(null); }); else createFamilyMember.mutateAsync({ clientId: clientId!, data: payload }).then(() => { invalidate(); setMemberDialog(null); }); }}>Save</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!assetDialog} onOpenChange={(open) => !open && setAssetDialog(null)}>
        <DialogContent className="max-w-lg bg-white border-slate-200"><DialogHeader><DialogTitle className="text-slate-900">{assetDialog?.editId ? "Edit Asset" : "Add Asset"}</DialogTitle></DialogHeader>
        {assetDialog && (<div className="space-y-4">{!assetDialog.editId && (<div><Label className="text-slate-700">Asset Type</Label><Select value={assetDialog.type} onValueChange={(v) => { setAssetDialog({ type: v, data: {} }); }}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200">{ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>)}
          {assetDialog.type === "mutual_fund" && (<div className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label className="text-xs text-slate-700">Asset Name</Label><FundAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} /></div><div><Label className="text-xs text-slate-700">Transaction Type</Label><Select value={assetDialog.data.transactionType ?? "Buy"} onValueChange={(v) => updateAssetField("transactionType", v)}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200"><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent></Select></div><div><Label className="text-xs text-slate-700">Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} /></div><div><Label className="text-xs text-slate-700">Units</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} /></div><div><Label className="text-xs text-slate-700">Price</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} /></div><div className="col-span-2"><Label className="text-xs text-slate-700">Amount (auto)</Label><Input readOnly value={assetDialog.data.amount ?? "0"} className="bg-slate-50 border-slate-200 text-slate-900" /></div></div>)}
          {assetDialog.type === "stock" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset Selection</Label>
                <StockAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} />
              </div>
              
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Institution Details</Label>
                <Input placeholder="e.g. HDFC Bank, ICICI Bank" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} />
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Institution Details</Label>
                <Input placeholder="e.g. SBI, Post Office" className="bg-white border-slate-200 text-slate-900 shadow-sm" value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} />
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
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
            <div className="space-y-4">
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
            <div className="space-y-4">
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
        </div>)}<DialogFooter><Button variant="outline" className="border-slate-200" onClick={() => setAssetDialog(null)}>Cancel</Button><Button onClick={() => { if (!assetDialog) return; if (assetDialog.editId) updateAssetMutation.mutateAsync({ clientId: clientId!, assetId: assetDialog.editId, data: { data: assetDialog.data, familyMemberId: selectedMemberId ?? undefined } }).then(() => { invalidate(); setAssetDialog(null); }); else createAsset.mutateAsync({ clientId: clientId!, data: { assetType: assetDialog.type as any, data: assetDialog.data, familyMemberId: selectedMemberId ?? undefined } }).then(() => { invalidate(); setAssetDialog(null); }); }}>Save</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!liabilityDialog} onOpenChange={(open) => !open && setLiabilityDialog(null)}>
        <DialogContent className="max-w-lg bg-white border-slate-200"><DialogHeader><DialogTitle className="text-slate-900">{liabilityDialog?.editId ? "Edit Liability" : "Add Liability"}</DialogTitle></DialogHeader>
        {liabilityDialog && (<div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label className="text-xs text-slate-700">Liability Type</Label><Select value={liabilityDialog.liabilityType} onValueChange={(v) => updateLiabilityField("liabilityType", v)}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200">{LIABILITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          {liabilityDialog.liabilityType === "Loans" && (<><div><Label className="text-xs text-slate-700">Loan Type</Label><Select value={liabilityDialog.loanType} onValueChange={(v) => updateLiabilityField("loanType", v)}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200">{LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>{liabilityDialog.loanType === "personal_loan" && (<div><Label className="text-xs text-slate-700">Interest Type</Label><Select value={liabilityDialog.interestType} onValueChange={(v) => updateLiabilityField("interestType", v)}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200"><SelectItem value="Reducing">Reducing</SelectItem><SelectItem value="Flat">Flat</SelectItem></SelectContent></Select></div>)}{liabilityDialog.loanType === "business_loan" && (<div><Label className="text-xs text-slate-700">Business Loan Type</Label><Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200">{BUSINESS_LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>)}</>)}
          {liabilityDialog.liabilityType === "EMIs" && (<div><Label className="text-xs text-slate-700">Repayment Model</Label><Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue placeholder="Select Model" /></SelectTrigger><SelectContent className="bg-white border-slate-200"><SelectItem value="Standard EMI">Standard EMI</SelectItem><SelectItem value="No Cost EMI">No Cost EMI</SelectItem></SelectContent></Select></div>)}
          {liabilityDialog.liabilityType === "Bills" && (<div><Label className="text-xs text-slate-700">Bill Category</Label><Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue placeholder="Select Category" /></SelectTrigger><SelectContent className="bg-white border-slate-200">{BILL_CATEGORIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>)}
          {liabilityDialog.liabilityType === "Taxes" && (<div className="col-span-2 grid grid-cols-3 gap-3 border border-slate-200 p-3 rounded-md bg-slate-50"><div className="col-span-3 font-semibold text-xs text-primary uppercase">Tax Liability Calculator</div><div><Label className="text-[10px] text-slate-700">Annual Income</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.income} onChange={(e) => updateLiabilityField("income", e.target.value)} /></div><div><Label className="text-[10px] text-slate-700">Std. Deduction</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.standardDeduction} onChange={(e) => updateLiabilityField("standardDeduction", e.target.value)} /></div><div><Label className="text-[10px] text-slate-700">TDS Paid</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.tds} onChange={(e) => updateLiabilityField("tds", e.target.value)} /></div><div className="col-span-1"><Label className="text-[10px] text-slate-700">Advance Tax</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.advanceTax} onChange={(e) => updateLiabilityField("advanceTax", e.target.value)} /></div><div className="col-span-2 flex items-end pb-1"><p className="text-[10px] text-slate-500 italic">*Includes 4% Health & Education Cess and 87A Rebate check.</p></div></div>)}
          {liabilityDialog.liabilityType === "Insurance Dues" && (<div className="col-span-2 grid grid-cols-2 gap-3 border border-slate-200 p-3 rounded-md bg-slate-50"><div className="col-span-2 font-semibold text-xs text-primary uppercase">Insurance Details</div><div><Label className="text-[10px] text-slate-700">Category</Label><Select value={liabilityDialog.insuranceCategory} onValueChange={(v) => updateLiabilityField("insuranceCategory", v)}><SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-900"><SelectValue placeholder="Select Category" /></SelectTrigger><SelectContent className="bg-white border-slate-200">{INSURANCE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>{(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Vehicle Insurance") && (<div><Label className="text-[10px] text-slate-700">Sub-type</Label><Select value={liabilityDialog.insuranceSubtype} onValueChange={(v) => updateLiabilityField("insuranceSubtype", v)}><SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-900"><SelectValue placeholder="Select Sub-type" /></SelectTrigger><SelectContent className="bg-white border-slate-200">{liabilityDialog.insuranceCategory === "Life Insurance" ? LIFE_INSURANCE_SUBTYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>) : VEHICLE_INSURANCE_SUBTYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>)}{liabilityDialog.insuranceCategory === "Home Insurance" ? (<><div><Label className="text-[10px] text-slate-700">Property Value</Label><Input className="h-8 text-xs bg-white border-slate-200 text-slate-900" type="number" value={liabilityDialog.propertyValue} onChange={(e) => updateLiabilityField("propertyValue", e.target.value)} /></div><div><Label className="text-[10px] text-slate-700">Insurance Rate (%)</Label><Input className="h-8 text-xs bg-white border-slate-200 text-slate-900" type="number" value={liabilityDialog.interestRate} onChange={(e) => updateLiabilityField("interestRate", e.target.value)} /></div></>) : liabilityDialog.insuranceCategory === "Vehicle Insurance" ? (<><div className="col-span-2 grid grid-cols-3 gap-2"><div><Label className="text-[10px] text-slate-700">Base Rate (IDV)</Label><Input className="h-8 text-xs bg-white border-slate-200 text-slate-900" type="number" value={liabilityDialog.baseRate} onChange={(e) => updateLiabilityField("baseRate", e.target.value)} /></div><div><Label className="text-[10px] text-slate-700">Add-ons</Label><Input className="h-8 text-xs bg-white border-slate-200 text-slate-900" type="number" value={liabilityDialog.addOns} onChange={(e) => updateLiabilityField("addOns", e.target.value)} /></div><div><Label className="text-[10px] text-slate-700">Discounts / NCB</Label><Input className="h-8 text-xs bg-white border-slate-200 text-slate-900" type="number" value={liabilityDialog.discounts} onChange={(e) => updateLiabilityField("discounts", e.target.value)} /></div></div><div className="col-span-2"><Label className="text-[10px] text-slate-700">Annual Premium (auto)</Label><Input className="h-8 text-xs bg-slate-100 border-slate-200" readOnly value={liabilityDialog.premium} /></div></>) : (<><div><Label className="text-[10px] text-slate-700">Annual Premium (₹)</Label><Input className="h-8 text-xs bg-white border-slate-200 text-slate-900" type="number" value={liabilityDialog.premium} onChange={(e) => updateLiabilityField("premium", e.target.value)} /></div>{(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Health Insurance") && (<div><Label className="text-[10px] text-slate-700">Tenure (Years)</Label><Input className="h-8 text-xs bg-white border-slate-200 text-slate-900" type="number" value={liabilityDialog.tenureYears} onChange={(e) => updateLiabilityField("tenureYears", e.target.value)} /></div>)}</>)}</div>)}
          {liabilityDialog.liabilityType === "Household Obligations" && (<div className="col-span-2 grid grid-cols-2 gap-3 border border-slate-200 p-3 rounded-md bg-slate-50"><div className="col-span-2 font-semibold text-xs text-primary uppercase">Household Obligation Details</div><div className="col-span-2"><Label className="text-[10px] text-slate-700">Expense Category</Label><Select value={liabilityDialog.householdCategory} onValueChange={(v) => updateLiabilityField("householdCategory", v)}><SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-900"><SelectValue placeholder="Select Category" /></SelectTrigger><SelectContent className="bg-white border-slate-200">{HOUSEHOLD_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            {liabilityDialog.householdCategory === "Housing" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px] text-slate-700">Rent</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.rent} onChange={(e) => updateLiabilityField("rent", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Maintenance</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.maintenance} onChange={(e) => updateLiabilityField("maintenance", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Taxes</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.taxes} onChange={(e) => updateLiabilityField("taxes", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Utilities" && (<div className="col-span-2 grid grid-cols-2 gap-2 mt-1"><div><Label className="text-[9px] text-slate-700">Electricity</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.electricity} onChange={(e) => updateLiabilityField("electricity", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Water</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.water} onChange={(e) => updateLiabilityField("water", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Gas</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.gas} onChange={(e) => updateLiabilityField("gas", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Internet</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.internet} onChange={(e) => updateLiabilityField("internet", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Groceries" && (<div className="col-span-2 mt-1"><Label className="text-[9px] text-slate-700">Daily Household Purchases (Total)</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.groceries} onChange={(e) => updateLiabilityField("groceries", e.target.value)} /></div>)}
            {liabilityDialog.householdCategory === "Education" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px] text-slate-700">Fees</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.fees} onChange={(e) => updateLiabilityField("fees", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Books</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.books} onChange={(e) => updateLiabilityField("books", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Academic Costs</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.academicCosts} onChange={(e) => updateLiabilityField("academicCosts", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Domestic Services" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px] text-slate-700">Maid Salary</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.maidSalary} onChange={(e) => updateLiabilityField("maidSalary", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Cook Salary</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.cookSalary} onChange={(e) => updateLiabilityField("cookSalary", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Service Costs</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.serviceCosts} onChange={(e) => updateLiabilityField("serviceCosts", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Healthcare" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px] text-slate-700">Medical Bills</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.medicalBills} onChange={(e) => updateLiabilityField("medicalBills", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Medicines</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.medicines} onChange={(e) => updateLiabilityField("medicines", e.target.value)} /></div><div><Label className="text-[9px] text-slate-700">Misc Costs</Label><Input type="number" className="h-7 text-xs bg-white border-slate-200 text-slate-900" value={liabilityDialog.miscCosts} onChange={(e) => updateLiabilityField("miscCosts", e.target.value)} /></div></div>)}
            <div className="col-span-2 mt-2 pt-2 border-t border-dashed border-slate-200"><Label className="text-[10px] font-bold text-slate-900">Total Monthly Amount (₹) {liabilityDialog.householdCategory && <span className="text-primary font-normal">(Calculated)</span>}</Label><Input type="number" value={liabilityDialog.householdAmount} onChange={(e) => updateLiabilityField("householdAmount", e.target.value)} className="h-8 text-xs font-bold bg-slate-100 border-slate-200" readOnly={!!liabilityDialog.householdCategory} /></div></div>)}
          <div className="col-span-2"><Label className="text-xs text-slate-700">{liabilityDialog.liabilityType === "Taxes" ? "Authority Name" : liabilityDialog.liabilityType === "Bills" ? "Service Provider" : liabilityDialog.liabilityType === "Insurance Dues" ? "Insurer Name" : "Lender Name"}</Label><Input className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.lenderName} onChange={(e) => updateLiabilityField("lenderName", e.target.value)} /></div>
          {liabilityDialog.liabilityType !== "Household Obligations" && (<><div><Label className="text-xs text-slate-700">{liabilityDialog.liabilityType === "Bills" ? "Original Bill Amount" : liabilityDialog.liabilityType === "Insurance Dues" ? "Projected Value" : "Total Liability Amount"}</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.totalLoanAmount} onChange={(e) => updateLiabilityField("totalLoanAmount", e.target.value)} /></div><div><Label className="text-xs text-slate-700">Outstanding Amount {(liabilityDialog.liabilityType === "Bills" || liabilityDialog.liabilityType === "Insurance Dues") && <span className="text-[10px] text-primary">(Auto-filled)</span>}</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.outstandingAmount} onChange={(e) => updateLiabilityField("outstandingAmount", e.target.value)} /></div></>)}
          {liabilityDialog.liabilityType !== "Taxes" && liabilityDialog.liabilityType !== "Insurance Dues" && liabilityDialog.liabilityType !== "Household Obligations" && (<><div><Label className="text-xs text-slate-700">{liabilityDialog.liabilityType === "Bills" ? "Late Penalty Rate (%)" : "Interest Rate (%)"}</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.interestRate} onChange={(e) => updateLiabilityField("interestRate", e.target.value)} /></div>{liabilityDialog.liabilityType !== "Bills" && (<><div><Label className="text-xs text-slate-700">Tenure (Years)</Label><Input type="number" step="0.5" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.tenure} onChange={(e) => updateLiabilityField("tenure", e.target.value)} /></div><div><Label className="text-xs text-slate-700">EMI / Monthly Payment {liabilityDialog.liabilityType === "Loans" && <span className="text-[10px] text-primary">(Auto-calculated)</span>}</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.emi} onChange={(e) => updateLiabilityField("emi", e.target.value)} /></div></>)}</>)}
          <div className={liabilityDialog.liabilityType === "Insurance Dues" ? "col-span-2" : ""}> <Label className="text-xs text-slate-700">{liabilityDialog.liabilityType === "Taxes" ? "Due Date" : liabilityDialog.liabilityType === "Bills" ? "Due Date" : "Start Date"}</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.startDate} onChange={(e) => updateLiabilityField("startDate", e.target.value)} /></div>
          {liabilityDialog.liabilityType !== "Insurance Dues" && (<div><Label className="text-xs text-slate-700">{liabilityDialog.liabilityType === "Taxes" ? "Maturity Date (Optional)" : "End Date"}</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={liabilityDialog.endDate} onChange={(e) => updateLiabilityField("endDate", e.target.value)} /></div>)}
        </div>)}<DialogFooter><Button variant="outline" className="border-slate-200" onClick={() => setLiabilityDialog(null)}>Cancel</Button><Button onClick={handleSaveLiability}>Save</Button></DialogFooter></DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
