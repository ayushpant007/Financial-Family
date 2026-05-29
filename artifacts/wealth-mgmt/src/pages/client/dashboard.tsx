import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Users, 
  User, 
  Filter,
  Pencil,
  Trash2
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetMe, useGetClientSummary, useListClientAssets, useListClientLiabilities, useListFamilyMembers,
  useCreateClientAsset, useUpdateClientAsset, useDeleteClientAsset,
  useCreateClientLiability, useUpdateClientLiability, useDeleteClientLiability,
  getGetClientSummaryQueryKey, getListClientAssetsQueryKey, getListClientLiabilitiesQueryKey, getListFamilyMembersQueryKey,
} from "@workspace/api-client-react";
import { MutualFundNav } from "@/components/mutual-fund-nav";
import { StockPriceDisplay } from "@/components/stock-price-display";
import { FDValuation, RDValuation, PFValuation, calculatePFCurrentValue, calculateEMI, LoanValuation, calculateIncomeTax, SIPValuation, SWPValuation, STPValuation, calculateMFCurrentValue } from "@/components/fixed-income-valuation";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FundAutocomplete } from "@/components/fund-autocomplete";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { AnimatedFeatureSpotlight3D } from "@/components/ui/animated-feature-spotlight3d";
import { Sparkles, Shield, BarChart3 } from "lucide-react";
import { ScrollingFeatureShowcase } from "@/components/ui/interactive-scrolling-story-component";

import { usePageBackground } from "@/hooks/usePageBackground";

const CLIENT_DASHBOARD_SLIDES = [
  {
    title: "Your Wealth, Live & Valued",
    description: "Every mutual fund, stock, FD, and provident fund is valued in real time using live NAV and NSE prices — no manual updates needed.",
    image: "/assets/assets.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Assets That Work for You",
    description: "SIPs compounding month by month, FDs maturing on schedule, EPF growing tax-free — your money is always working, and now you can see exactly how.",
    image: "/assets/step1.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Know What You Owe",
    description: "Home loans, car EMIs, insurance premiums, tax dues — tracked with precise outstanding balances and auto-calculated repayment projections.",
    image: "/assets/security.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Your Net Worth, Always Accurate",
    description: "Assets minus liabilities, calculated live. See exactly where you stand today — and where you're headed tomorrow.",
    image: "/assets/assets.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

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

export default function ClientDashboard() {
  const { data: user } = useGetMe({ query: { retry: false, queryKey: ["me"] } as any });
  const clientId = user?.clientId;
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  
  const scrollToPortfolio = () => {
    document.getElementById('portfolio-section')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  usePageBackground('light');

  const { data: familyMembers } = useListFamilyMembers(clientId!, { query: { enabled: !!clientId, queryKey: getListFamilyMembersQueryKey(clientId!) } as any });
  const { data: summary } = useGetClientSummary(clientId!, { query: { enabled: !!clientId, queryKey: getGetClientSummaryQueryKey(clientId!) } as any });
  const { data: assets } = useListClientAssets(clientId!, { query: { enabled: !!clientId, queryKey: getListClientAssetsQueryKey(clientId!) } as any });
  const { data: liabilities } = useListClientLiabilities(clientId!, { query: { enabled: !!clientId, queryKey: getListClientLiabilitiesQueryKey(clientId!) } as any });

  const createAsset = useCreateClientAsset();
  const updateAssetMutation = useUpdateClientAsset();
  const deleteAsset = useDeleteClientAsset();
  const createLiability = useCreateClientLiability();
  const updateLiability = useUpdateClientLiability();
  const deleteLiability = useDeleteClientLiability();

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
    queryClient.invalidateQueries({ queryKey: getGetClientSummaryQueryKey(clientId!) });
    queryClient.invalidateQueries({ queryKey: getListClientAssetsQueryKey(clientId!) });
    queryClient.invalidateQueries({ queryKey: getListClientLiabilitiesQueryKey(clientId!) });
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

  const filteredAssets = selectedMemberId === null 
    ? (assets ?? []) 
    : (assets?.filter(a => a.familyMemberId === selectedMemberId) ?? []);
    
  const filteredLiabilities = selectedMemberId === null 
    ? (liabilities ?? []) 
    : (liabilities?.filter(l => l.familyMemberId === selectedMemberId) ?? []);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Top Spotlight Section */}
        <AnimatedFeatureSpotlight3D
          className="glass-panel py-8 border-slate-200 shadow-xl"
          preheaderIcon={<Sparkles className="w-4 h-4 text-primary" />}
          preheaderText="Portfolio Performance"
          heading={
            <span className="text-slate-900">
              Welcome back, <span className="text-primary">{user?.name}</span>
            </span>
          }
          description={`Your current net worth is ${formatCurrency(summary?.netWorth ?? 0)}. You have ${assets?.length ?? 0} active assets and ${liabilities?.length ?? 0} liabilities tracked.`}
          buttonText="View Detailed Report"
          buttonProps={{ onClick: scrollToPortfolio }}
          imageUrl="/assets/assets.png"
          imageAlt="Portfolio Performance"
        />

        <ScrollingFeatureShowcase
          slides={CLIENT_DASHBOARD_SLIDES}
          height="460px"
          ctaText="View Family Tree"
          ctaHref="/client/family-tree"
        />

        <div id="portfolio-section" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 scroll-mt-20" data-reveal>
          <div><h1 className="text-2xl font-bold text-slate-900">My Portfolio</h1><p className="text-sm text-slate-500 mt-1">Your complete financial overview</p></div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={selectedMemberId?.toString() ?? "all"} onValueChange={(val) => setSelectedMemberId(val === "all" ? null : parseInt(val))}>
              <SelectTrigger className="w-[200px] bg-white border-slate-200 text-slate-900 shadow-sm">
                <SelectValue placeholder="Filter by member" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900">
                <SelectItem value="all">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>Full Portfolio</span></div>
                </SelectItem>
                {familyMembers?.map(member => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>{member.name}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="glass-panel border-emerald-200 bg-emerald-50/30" data-reveal data-reveal-delay="100">
            <CardContent className="pt-6">
              <p className="text-[10px] text-emerald-600/60 uppercase tracking-[0.2em] font-bold">Total Assets</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 tracking-tight">{formatCurrency(summary?.totalAssets ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-rose-200 bg-rose-50/30" data-reveal data-reveal-delay="200">
            <CardContent className="pt-6">
              <p className="text-[10px] text-rose-600/60 uppercase tracking-[0.2em] font-bold">Total Liabilities</p>
              <p className="text-2xl md:text-3xl font-bold text-rose-600 mt-1 tracking-tight">{formatCurrency(summary?.totalLiabilities ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-primary/30 bg-primary/5 shadow-xl md:shadow-2xl shadow-primary/5" data-reveal data-reveal-delay="300">
            <CardContent className="pt-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Current Net Worth</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 tracking-tight">
                {formatCurrency(summary?.netWorth ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-reveal data-reveal-delay="400">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Assets</h2>
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/10" onClick={() => setAssetDialog({ type: "mutual_fund", data: {} })}>
                <Plus className="h-4 w-4" /> Add Asset
              </Button>
            </div>
            <Card className="glass-panel border-slate-200">
              <CardHeader>
                <CardTitle className="text-base font-medium text-slate-900">
                  {selectedMemberId === null ? "My Assets" : `${familyMembers?.find(m => m.id === selectedMemberId)?.name}'s Assets`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-3">
                {filteredAssets.length === 0 ? (
                  <p className="text-sm text-slate-300 py-4 text-center">No assets found</p>
                ) : (
                  filteredAssets.map((asset) => (
                    <div key={asset.id} className="p-3 sm:p-5 rounded-2xl border border-slate-100 bg-white/40 hover:bg-white/80 transition-all group shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="secondary" className="text-[9px] md:text-[10px] bg-slate-100 text-slate-700 border-slate-200 uppercase tracking-wider">
                              {ASSET_LABELS[asset.assetType]} {(asset.data as any).investmentMethod ? ` - ${(asset.data as any).investmentMethod}` : ""}
                            </Badge>
                          </div>
                          <p className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {formatCurrency(getDisplayValue(asset))}
                          </p>
                          <div className="text-[10px] md:text-xs text-slate-500 space-y-1.5 mt-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                            {Object.entries(asset.data as Record<string, any>).map(([k, v]) => {
                              const skip = ["amount", "basicSalary", "dearnessAllowance", "employeeContributionPercent", "employerContributionPercent", "interestRate", "tenureYears", "currentBalance", "salaryGrowth", "includeEPS", "totalContribution", "startDate", "maturityDate", "monthlyInvestment", "investmentAmount", "institutionName", "payoutType", "age"].includes(k);
                              return !skip && (
                                <div key={k} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 border-b border-slate-200/50 last:border-0 gap-1">
                                  <span className="capitalize opacity-60 font-bold text-[9px] uppercase tracking-wider">{k.replace(/([A-Z])/g, " $1")}</span>
                                  <span className="font-bold text-slate-800 break-words sm:text-right flex-1 sm:ml-4">{String(v)}</span>
                                </div>
                              );
                            })}
                          </div>
                          {asset.assetType === "mutual_fund" && (asset.data as any).assetName && (
                            <div className="mt-3">
                              {!(asset.data as any).investmentMethod || (asset.data as any).investmentMethod === "Lump sum" ? (
                                <MutualFundNav
                                  fundName={(asset.data as any).assetName}
                                  units={parseFloat((asset.data as any).units ?? "0")}
                                  investmentAmount={parseFloat((asset.data as any).amount ?? "0")}
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
                          {asset.assetType === "stock" && (asset.data as any).assetName && <StockPriceDisplay stockName={(asset.data as any).assetName} units={parseFloat((asset.data as any).units ?? "0")} investmentAmount={parseFloat((asset.data as any).amount ?? "0")} />}
                          {asset.assetType === "fixed_deposit" && <FDValuation data={asset.data as any} />}
                          {asset.assetType === "recurring_deposit" && <RDValuation data={asset.data as any} />}
                          {asset.assetType === "provident_fund" && <PFValuation data={asset.data as any} />}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-1.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white shadow-sm border border-transparent hover:border-slate-100" onClick={() => {
                              const data: Record<string, string> = {};
                              Object.entries(asset.data as Record<string, unknown>).forEach(([k, v]) => { data[k] = String(v); });
                              setAssetDialog({ type: asset.assetType, data, editId: asset.id });
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-transparent hover:border-rose-100" onClick={() => { if(confirm("Delete asset?")) deleteAsset.mutateAsync({ clientId: clientId!, assetId: asset.id }).then(invalidate); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Liabilities</h2>
              <Button size="sm" variant="destructive" className="gap-2 shadow-lg shadow-rose-500/10" onClick={() => setLiabilityDialog({ liabilityType: "Loans", loanType: "home_loan", lenderName: "", totalLoanAmount: "", outstandingAmount: "", interestRate: "", emi: "", startDate: "", endDate: "", interestType: "Reducing", subType: "", tenure: "", income: "", tds: "", advanceTax: "", standardDeduction: "75000", insuranceCategory: "", insuranceSubtype: "", propertyValue: "", insuranceRate: "", premium: "", tenureYears: "", baseRate: "", addOns: "", discounts: "", householdCategory: "", householdAmount: "", rent: "", maintenance: "", taxes: "", electricity: "", water: "", gas: "", internet: "", groceries: "", fees: "", books: "", academicCosts: "", maidSalary: "", cookSalary: "", serviceCosts: "", medicalBills: "", medicines: "", miscCosts: "" })}>
                <Plus className="h-4 w-4" /> Add Liability
              </Button>
            </div>
            <Card className="glass-panel border-slate-200">
              <CardHeader>
                <CardTitle className="text-base font-medium text-slate-900">
                  {selectedMemberId === null ? "My Liabilities" : `${familyMembers?.find(m => m.id === selectedMemberId)?.name}'s Liabilities`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-3">
                {filteredLiabilities.length === 0 ? (
                  <p className="text-sm text-slate-300 py-4 text-center">No liabilities found</p>
                ) : (
                  filteredLiabilities.map((liability) => (
                    <div key={liability.id} className="p-3 sm:p-5 rounded-2xl border border-slate-100 bg-white/40 hover:bg-white/80 transition-all group shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="destructive" className="text-[9px] md:text-[10px] bg-rose-50 text-rose-600 border-rose-100 uppercase tracking-wider">
                              {(() => { const parts = liability.notes?.split("|") ?? []; const type = parts[0]; const subType = parts[parts.length - 1]; if (type === "Loans") return LOAN_LABELS[liability.loanType]; if (type === "Bills" && subType && subType !== "Bills") return `Bills - ${subType}`; if (type === "Insurance Dues") { const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1]; const sub = parts.find(p => p.startsWith("Sub:"))?.split(":")[1]; return sub ? `${cat} - ${sub}` : (cat ?? "Insurance"); } return type || LOAN_LABELS[liability.loanType]; })()}
                            </Badge>
                          </div>
                          <p className="text-sm font-bold text-slate-900 truncate">{liability.lenderName}</p>
                          <div className="text-[10px] md:text-xs text-slate-500 mt-4 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-inner">
                            <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Total Liability</span><span className="text-slate-700 font-semibold">{formatCurrency(liability.totalLoanAmount)}</span></p>
                            <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Outstanding</span><span className="text-rose-600 font-bold">{formatCurrency(liability.outstandingAmount)}</span></p>
                            <p className="flex justify-between border-b border-slate-100/50 py-1"><span className="opacity-60 font-medium">Rate</span><span className="text-slate-700 font-semibold">{liability.interestRate}%</span></p>
                            <p className="flex justify-between last:border-0 py-1"><span className="opacity-60 font-medium">EMI</span><span className="text-slate-900 font-bold">{formatCurrency(liability.emi)}</span></p>
                          </div>
                          <LoanValuation liability={liability} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-1.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white shadow-sm border border-transparent hover:border-slate-100" onClick={() => { 
                              const parts = liability.notes?.split("|") ?? []; 
                              const start = liability.startDate ? new Date(liability.startDate) : null; 
                              const end = liability.endDate ? new Date(liability.endDate) : null; 
                              const months = (start && end) ? (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) : 0; 
                              setLiabilityDialog({ loanType: liability.loanType, liabilityType: parts[0] ?? "Loans", interestType: liability.notes?.includes("|Flat") ? "Flat" : "Reducing", subType: parts.length > 1 && parts[parts.length-1] !== "Flat" ? parts[parts.length-1] : "", lenderName: liability.lenderName, totalLoanAmount: String(liability.totalLoanAmount), outstandingAmount: String(liability.outstandingAmount), interestRate: String(liability.interestRate), emi: String(liability.emi), startDate: liability.startDate ?? "", endDate: liability.endDate ?? "", tenure: months > 0 ? (months / 12).toFixed(1) : "", income: parts.find((p: string) => p.startsWith("Income:"))?.split(":")[1] ?? "", tds: parts.find((p: string) => p.startsWith("TDS:"))?.split(":")[1] ?? "", advanceTax: parts.find((p: string) => p.startsWith("Advance:"))?.split(":")[1] ?? "", standardDeduction: parts.find((p: string) => p.startsWith("StdDed:"))?.split(":")[1] ?? "75000", insuranceCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "", insuranceSubtype: parts.find((p: string) => p.startsWith("Sub:"))?.split(":")[1] ?? "", propertyValue: "", insuranceRate: "", premium: parts.find((p: string) => p.startsWith("Premium:"))?.split(":")[1] ?? "", tenureYears: parts.find((p: string) => p.startsWith("Years:"))?.split(":")[1] ?? "", baseRate: parts.find((p: string) => p.startsWith("Base:"))?.split(":")[1] ?? "", addOns: parts.find((p: string) => p.startsWith("Addons:"))?.split(":")[1] ?? "", discounts: parts.find((p: string) => p.startsWith("Disc:"))?.split(":")[1] ?? "", householdCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "", householdAmount: parts.find((p: string) => p.startsWith("Amt:"))?.split(":")[1] ?? "", rent: parts.find((p: string) => p.startsWith("Rent:"))?.split(":")[1] ?? "", maintenance: parts.find((p: string) => p.startsWith("Maint:"))?.split(":")[1] ?? "", taxes: parts.find((p: string) => p.startsWith("Taxes:"))?.split(":")[1] ?? "", electricity: parts.find((p: string) => p.startsWith("Elec:"))?.split(":")[1] ?? "", water: parts.find((p: string) => p.startsWith("Water:"))?.split(":")[1] ?? "", gas: parts.find((p: string) => p.startsWith("Gas:"))?.split(":")[1] ?? "", internet: parts.find((p: string) => p.startsWith("Net:"))?.split(":")[1] ?? "", groceries: parts.find((p: string) => p.startsWith("Groc:"))?.split(":")[1] ?? "", fees: parts.find((p: string) => p.startsWith("Fees:"))?.split(":")[1] ?? "", books: parts.find((p: string) => p.startsWith("Books:"))?.split(":")[1] ?? "", academicCosts: parts.find((p: string) => p.startsWith("Acad:"))?.split(":")[1] ?? "", maidSalary: parts.find((p: string) => p.startsWith("Maid:"))?.split(":")[1] ?? "", cookSalary: parts.find((p: string) => p.startsWith("Cook:"))?.split(":")[1] ?? "", serviceCosts: parts.find((p: string) => p.startsWith("Serv:"))?.split(":")[1] ?? "", medicalBills: parts.find((p: string) => p.startsWith("MedB:"))?.split(":")[1] ?? "", medicines: parts.find((p: string) => p.startsWith("MedI:"))?.split(":")[1] ?? "", miscCosts: parts.find((p: string) => p.startsWith("Misc:"))?.split(":")[1] ?? "", editId: liability.id }); 
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-transparent hover:border-rose-100" onClick={() => { if(confirm("Delete liability?")) deleteLiability.mutateAsync({ clientId: clientId!, liabilityId: liability.id }).then(invalidate); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!assetDialog} onOpenChange={(open) => !open && setAssetDialog(null)}>
        <DialogContent className="max-w-lg bg-white border-slate-200 shadow-2xl">
          <DialogHeader><DialogTitle className="text-slate-900 font-bold">
            {assetDialog?.editId ? "Edit Asset" : "Add Asset"}
          </DialogTitle></DialogHeader>
        {assetDialog && (<div className="space-y-4">{!assetDialog.editId && (<div><Label className="text-slate-700">Asset Type</Label><Select value={assetDialog.type} onValueChange={(v) => { setAssetDialog({ type: v, data: {} }); }}><SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger><SelectContent className="bg-white border-slate-200 text-slate-900">{ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>)}
          {assetDialog.type === "mutual_fund" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Asset Name</Label>
                <FundAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Investment Method</Label>
                <Select value={assetDialog.data.investmentMethod ?? "Lump sum"} onValueChange={(v) => updateAssetField("investmentMethod", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lump sum">Lump sum</SelectItem>
                    <SelectItem value="SIP">SIP (Systematic Investment Plan)</SelectItem>
                    <SelectItem value="SWP">SWP (Systematic Withdrawal Plan)</SelectItem>
                    <SelectItem value="STP">STP (Systematic Transfer Plan)</SelectItem>
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
        </div>
      )}
      <DialogFooter><Button variant="outline" onClick={() => setAssetDialog(null)}>Cancel</Button><Button onClick={() => { if (!assetDialog) return; if (assetDialog.editId) updateAssetMutation.mutateAsync({ clientId: clientId!, assetId: assetDialog.editId, data: { data: assetDialog.data, familyMemberId: selectedMemberId } }).then(() => { invalidate(); setAssetDialog(null); }); else createAsset.mutateAsync({ clientId: clientId!, data: { assetType: assetDialog.type as any, data: assetDialog.data, familyMemberId: selectedMemberId } }).then(() => { invalidate(); setAssetDialog(null); }); }}>Save</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!liabilityDialog} onOpenChange={(open) => !open && setLiabilityDialog(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{liabilityDialog?.editId ? "Edit Liability" : "Add Liability"}</DialogTitle></DialogHeader>
        {liabilityDialog && (<div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label className="text-xs">Liability Type</Label><Select value={liabilityDialog.liabilityType} onValueChange={(v) => updateLiabilityField("liabilityType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LIABILITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          {liabilityDialog.liabilityType === "Loans" && (<><div><Label className="text-xs">Loan Type</Label><Select value={liabilityDialog.loanType} onValueChange={(v) => updateLiabilityField("loanType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>{liabilityDialog.loanType === "personal_loan" && (<div><Label className="text-xs">Interest Type</Label><Select value={liabilityDialog.interestType} onValueChange={(v) => updateLiabilityField("interestType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Reducing">Reducing</SelectItem><SelectItem value="Flat">Flat</SelectItem></SelectContent></Select></div>)}{liabilityDialog.loanType === "business_loan" && (<div><Label className="text-xs">Business Loan Type</Label><Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BUSINESS_LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>)}</>)}
          {liabilityDialog.liabilityType === "EMIs" && (<div><Label className="text-xs">Repayment Model</Label><Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}><SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger><SelectContent><SelectItem value="Standard EMI">Standard EMI</SelectItem><SelectItem value="No Cost EMI">No Cost EMI</SelectItem></SelectContent></Select></div>)}
          {liabilityDialog.liabilityType === "Bills" && (<div><Label className="text-xs">Bill Category</Label><Select value={liabilityDialog.subType} onValueChange={(v) => updateLiabilityField("subType", v)}><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger><SelectContent>{BILL_CATEGORIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>)}
          {liabilityDialog.liabilityType === "Taxes" && (<div className="col-span-2 grid grid-cols-3 gap-3 border p-3 rounded-md bg-muted/20"><div className="col-span-3 font-semibold text-xs text-primary uppercase">Tax Liability Calculator</div><div><Label className="text-[10px]">Annual Income</Label><Input type="number" value={liabilityDialog.income} onChange={(e) => updateLiabilityField("income", e.target.value)} /></div><div><Label className="text-[10px]">Std. Deduction</Label><Input type="number" value={liabilityDialog.standardDeduction} onChange={(e) => updateLiabilityField("standardDeduction", e.target.value)} /></div><div><Label className="text-[10px]">TDS Paid</Label><Input type="number" value={liabilityDialog.tds} onChange={(e) => updateLiabilityField("tds", e.target.value)} /></div><div className="col-span-1"><Label className="text-[10px]">Advance Tax</Label><Input type="number" value={liabilityDialog.advanceTax} onChange={(e) => updateLiabilityField("advanceTax", e.target.value)} /></div><div className="col-span-2 flex items-end pb-1"><p className="text-[10px] text-muted-foreground italic">*Includes 4% Health & Education Cess and 87A Rebate check.</p></div></div>)}
          {liabilityDialog.liabilityType === "Insurance Dues" && (<div className="col-span-2 grid grid-cols-2 gap-3 border p-3 rounded-md bg-muted/20"><div className="col-span-2 font-semibold text-xs text-primary uppercase">Insurance Details</div><div><Label className="text-[10px]">Category</Label><Select value={liabilityDialog.insuranceCategory} onValueChange={(v) => updateLiabilityField("insuranceCategory", v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger><SelectContent>{INSURANCE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>{(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Vehicle Insurance") && (<div><Label className="text-[10px]">Sub-type</Label><Select value={liabilityDialog.insuranceSubtype} onValueChange={(v) => updateLiabilityField("insuranceSubtype", v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Sub-type" /></SelectTrigger><SelectContent>{liabilityDialog.insuranceCategory === "Life Insurance" ? LIFE_INSURANCE_SUBTYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>) : VEHICLE_INSURANCE_SUBTYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>)}{liabilityDialog.insuranceCategory === "Home Insurance" ? (<><div><Label className="text-[10px]">Property Value</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.propertyValue} onChange={(e) => updateLiabilityField("propertyValue", e.target.value)} /></div><div><Label className="text-[10px]">Insurance Rate (%)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.interestRate} onChange={(e) => updateLiabilityField("interestRate", e.target.value)} /></div></>) : liabilityDialog.insuranceCategory === "Vehicle Insurance" ? (<><div className="col-span-2 grid grid-cols-3 gap-2"><div><Label className="text-[10px]">Base Rate (IDV)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.baseRate} onChange={(e) => updateLiabilityField("baseRate", e.target.value)} /></div><div><Label className="text-[10px]">Add-ons</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.addOns} onChange={(e) => updateLiabilityField("addOns", e.target.value)} /></div><div><Label className="text-[10px]">Discounts / NCB</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.discounts} onChange={(e) => updateLiabilityField("discounts", e.target.value)} /></div></div><div className="col-span-2"><Label className="text-[10px]">Annual Premium (auto)</Label><Input className="h-8 text-xs bg-muted" readOnly value={liabilityDialog.premium} /></div></>) : (<><div><Label className="text-[10px]">Annual Premium (₹)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.premium} onChange={(e) => updateLiabilityField("premium", e.target.value)} /></div>{(liabilityDialog.insuranceCategory === "Life Insurance" || liabilityDialog.insuranceCategory === "Health Insurance") && (<div><Label className="text-[10px]">Tenure (Years)</Label><Input className="h-8 text-xs" type="number" value={liabilityDialog.tenureYears} onChange={(e) => updateLiabilityField("tenureYears", e.target.value)} /></div>)}</>)}</div>)}
          {liabilityDialog.liabilityType === "Household Obligations" && (<div className="col-span-2 grid grid-cols-2 gap-3 border p-3 rounded-md bg-muted/20"><div className="col-span-2 font-semibold text-xs text-primary uppercase">Household Obligation Details</div><div className="col-span-2"><Label className="text-[10px]">Expense Category</Label><Select value={liabilityDialog.householdCategory} onValueChange={(v) => updateLiabilityField("householdCategory", v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger><SelectContent>{HOUSEHOLD_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            {liabilityDialog.householdCategory === "Housing" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px]">Rent</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.rent} onChange={(e) => updateLiabilityField("rent", e.target.value)} /></div><div><Label className="text-[9px]">Maintenance</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.maintenance} onChange={(e) => updateLiabilityField("maintenance", e.target.value)} /></div><div><Label className="text-[9px]">Taxes</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.taxes} onChange={(e) => updateLiabilityField("taxes", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Utilities" && (<div className="col-span-2 grid grid-cols-2 gap-2 mt-1"><div><Label className="text-[9px]">Electricity</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.electricity} onChange={(e) => updateLiabilityField("electricity", e.target.value)} /></div><div><Label className="text-[9px]">Water</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.water} onChange={(e) => updateLiabilityField("water", e.target.value)} /></div><div><Label className="text-[9px]">Gas</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.gas} onChange={(e) => updateLiabilityField("gas", e.target.value)} /></div><div><Label className="text-[9px]">Internet</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.internet} onChange={(e) => updateLiabilityField("internet", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Groceries" && (<div className="col-span-2 mt-1"><Label className="text-[9px]">Daily Household Purchases (Total)</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.groceries} onChange={(e) => updateLiabilityField("groceries", e.target.value)} /></div>)}
            {liabilityDialog.householdCategory === "Education" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px]">Fees</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.fees} onChange={(e) => updateLiabilityField("fees", e.target.value)} /></div><div><Label className="text-[9px]">Books</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.books} onChange={(e) => updateLiabilityField("books", e.target.value)} /></div><div><Label className="text-[9px]">Academic Costs</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.academicCosts} onChange={(e) => updateLiabilityField("academicCosts", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Domestic Services" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px]">Maid Salary</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.maidSalary} onChange={(e) => updateLiabilityField("maidSalary", e.target.value)} /></div><div><Label className="text-[9px]">Cook Salary</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.cookSalary} onChange={(e) => updateLiabilityField("cookSalary", e.target.value)} /></div><div><Label className="text-[9px]">Service Costs</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.serviceCosts} onChange={(e) => updateLiabilityField("serviceCosts", e.target.value)} /></div></div>)}
            {liabilityDialog.householdCategory === "Healthcare" && (<div className="col-span-2 grid grid-cols-3 gap-2 mt-1"><div><Label className="text-[9px]">Medical Bills</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.medicalBills} onChange={(e) => updateLiabilityField("medicalBills", e.target.value)} /></div><div><Label className="text-[9px]">Medicines</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.medicines} onChange={(e) => updateLiabilityField("medicines", e.target.value)} /></div><div><Label className="text-[9px]">Misc Costs</Label><Input type="number" className="h-7 text-xs" value={liabilityDialog.miscCosts} onChange={(e) => updateLiabilityField("miscCosts", e.target.value)} /></div></div>)}
            <div className="col-span-2 mt-2 pt-2 border-t border-dashed"><Label className="text-[10px] font-bold">Total Monthly Amount (₹) {liabilityDialog.householdCategory && <span className="text-primary font-normal">(Calculated)</span>}</Label><Input type="number" value={liabilityDialog.householdAmount} onChange={(e) => updateLiabilityField("householdAmount", e.target.value)} className="h-8 text-xs font-bold bg-muted" readOnly={!!liabilityDialog.householdCategory} /></div></div>)}
          <div className="col-span-2"><Label className="text-xs">{liabilityDialog.liabilityType === "Taxes" ? "Authority Name" : liabilityDialog.liabilityType === "Bills" ? "Service Provider" : liabilityDialog.liabilityType === "Insurance Dues" ? "Insurer Name" : "Lender Name"}</Label><Input value={liabilityDialog.lenderName} onChange={(e) => updateLiabilityField("lenderName", e.target.value)} /></div>
          {liabilityDialog.liabilityType !== "Household Obligations" && (<><div><Label className="text-xs">{liabilityDialog.liabilityType === "Bills" ? "Original Bill Amount" : liabilityDialog.liabilityType === "Insurance Dues" ? "Projected Value" : "Total Liability Amount"}</Label><Input type="number" value={liabilityDialog.totalLoanAmount} onChange={(e) => updateLiabilityField("totalLoanAmount", e.target.value)} /></div><div><Label className="text-xs">Outstanding Amount {(liabilityDialog.liabilityType === "Bills" || liabilityDialog.liabilityType === "Insurance Dues") && <span className="text-[10px] text-primary">(Auto-filled)</span>}</Label><Input type="number" value={liabilityDialog.outstandingAmount} onChange={(e) => updateLiabilityField("outstandingAmount", e.target.value)} /></div></>)}
          {liabilityDialog.liabilityType !== "Taxes" && liabilityDialog.liabilityType !== "Insurance Dues" && liabilityDialog.liabilityType !== "Household Obligations" && (<><div><Label className="text-xs">{liabilityDialog.liabilityType === "Bills" ? "Late Penalty Rate (%)" : "Interest Rate (%)"}</Label><Input type="number" value={liabilityDialog.interestRate} onChange={(e) => updateLiabilityField("interestRate", e.target.value)} /></div>{liabilityDialog.liabilityType !== "Bills" && (<><div><Label className="text-xs">Tenure (Years)</Label><Input type="number" step="0.5" value={liabilityDialog.tenure} onChange={(e) => updateLiabilityField("tenure", e.target.value)} /></div><div><Label className="text-xs">EMI / Monthly Payment {liabilityDialog.liabilityType === "Loans" && <span className="text-[10px] text-primary">(Auto-calculated)</span>}</Label><Input type="number" value={liabilityDialog.emi} onChange={(e) => updateLiabilityField("emi", e.target.value)} /></div></>)}</>)}
          <div className={liabilityDialog.liabilityType === "Insurance Dues" ? "col-span-2" : ""}> <Label className="text-xs">{liabilityDialog.liabilityType === "Taxes" ? "Due Date" : liabilityDialog.liabilityType === "Bills" ? "Due Date" : "Start Date"}</Label><Input type="date" value={liabilityDialog.startDate} onChange={(e) => updateLiabilityField("startDate", e.target.value)} /></div>
          {liabilityDialog.liabilityType !== "Insurance Dues" && (<div><Label className="text-xs">{liabilityDialog.liabilityType === "Taxes" ? "Maturity Date (Optional)" : "End Date"}</Label><Input type="date" value={liabilityDialog.endDate} onChange={(e) => updateLiabilityField("endDate", e.target.value)} /></div>)}
        </div>)}<DialogFooter><Button variant="outline" onClick={() => setLiabilityDialog(null)}>Cancel</Button><Button onClick={handleSaveLiability}>Save</Button></DialogFooter></DialogContent>
      </Dialog>
    </Layout>
  );
}
