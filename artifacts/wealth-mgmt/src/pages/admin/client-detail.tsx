import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FundAutocomplete } from "@/components/fund-autocomplete";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { MutualFundNav } from "@/components/mutual-fund-nav";
import { StockPriceDisplay } from "@/components/stock-price-display";
import { FDValuation, RDValuation, PFValuation, calculatePFCurrentValue, calculateEMI, LoanValuation, calculateIncomeTax, SIPValuation, SWPValuation, STPValuation, calculateMFCurrentValue } from "@/components/fixed-income-valuation";

const ASSET_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  stock: "Stock",
  fixed_deposit: "Fixed Deposit",
  recurring_deposit: "Recurring Deposit",
  provident_fund: "Provident Fund",
  cash_bank: "Cash & Bank",
};

const LOAN_LABELS: Record<string, string> = {
  home_loan: "Home Loan", car_loan: "Car Loan", personal_loan: "Personal Loan",
  education_loan: "Education Loan", business_loan: "Business Loan", other: "Other",
};

const CHART_COLORS = ["#1e3a5f", "#c9a54a", "#2d5a8e", "#8b6914", "#4a7fad"];

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

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/clients">
              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-muted/50">
                <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground truncate">{client?.name ?? "Loading..."}</h1>
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1 opacity-70">
                @{client?.username} {client?.email ? `· ${client.email}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card className="premium-border bg-green-500/5 border-green-500/10">
            <CardContent className="pt-6">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Family Assets</p>
              <p className="text-2xl font-black text-green-700 mt-1">{formatCurrency(summary?.totalAssets ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="premium-border bg-red-500/5 border-red-500/10">
            <CardContent className="pt-6">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Family Liabilities</p>
              <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(summary?.totalLiabilities ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="gold-gradient border-none shadow-xl shadow-secondary/20">
            <CardContent className="pt-6 text-secondary-foreground">
              <p className="text-[10px] font-bold text-secondary-foreground/60 uppercase tracking-[0.2em]">Family Net Worth</p>
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
                <CardTitle className="text-xl">Family Tree</CardTitle>
                <CardDescription>Visualize and manage family relationships and their financials</CardDescription>
              </div>
              {!isAdmin && (
                <Button size="sm" variant="outline" onClick={() => setFamilyMemberDialog({ name: "", dob: "", phone: "", relation: "Child" })}>
                  <Plus className="h-4 w-4 mr-2" /> Add Member
                </Button>
              )}
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
                readOnly={isAdmin}
              />
            )}
          </CardContent>
        </Card>

        {chartData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Asset Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {chartData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Assets Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {selectedMemberId === null ? "My Assets" : `${familyMembers?.find(m => m.id === selectedMemberId)?.name}'s Assets`} 
                ({assets?.filter(a => (a.familyMemberId ?? null) === (selectedMemberId ?? null)).length ?? 0})
              </h2>
              {(!isAdmin || selectedMemberId === null) && (
                <Button size="sm" className="gap-2" onClick={() => { setAssetDialog({ type: "mutual_fund", data: {} }); }}>
                  <Plus className="h-4 w-4" /> Add Asset
                </Button>
              )}
            </div>

            {(() => {
              const filteredAssets = assets?.filter(a => (a.familyMemberId ?? null) === (selectedMemberId ?? null)) ?? [];
              if (filteredAssets.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No assets yet</CardContent></Card>;
              
              return filteredAssets.map((asset) => (
                <Card key={asset.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-2">
                          {ASSET_LABELS[asset.assetType]}
                          {(asset.data as any).investmentMethod ? ` - ${(asset.data as any).investmentMethod}` : ""}
                        </Badge>
                        <p className="text-lg font-bold text-green-700">
                          {asset.assetType === "provident_fund" 
                            ? formatCurrency(calculatePFCurrentValue(asset.data as Record<string, any>).currentValue)
                            : (asset.data as any).investmentMethod && (asset.data as any).investmentMethod !== "Lump sum"
                            ? formatCurrency(calculateMFCurrentValue(asset.data))
                            : formatCurrency(asset.value)}
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                          {Object.entries(asset.data as Record<string, unknown>).map(([k, v]) => {
                            const skip = ["amount", "basicSalary", "dearnessAllowance", "employeeContributionPercent", "employerContributionPercent", "interestRate", "tenureYears", "currentBalance", "salaryGrowth", "includeEPS", "totalContribution", "startDate", "maturityDate", "monthlyInvestment", "investmentAmount", "institutionName", "payoutType"].includes(k);
                            return !skip && <p key={k}><span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>: {String(v)}</p>;
                          })}
                        </div>
                        {asset.assetType === "mutual_fund" && (asset.data as any).assetName && (
                          <>
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
                          </>
                        )}
                        {asset.assetType === "stock" && (asset.data as any).assetName && (
                          <StockPriceDisplay
                            stockName={(asset.data as any).assetName}
                            units={parseFloat((asset.data as any).units ?? "0")}
                            investmentAmount={parseFloat((asset.data as any).amount ?? "0")}
                          />
                        )}
                        {asset.assetType === "fixed_deposit" && (
                          <FDValuation data={asset.data as Record<string, unknown>} />
                        )}
                        {asset.assetType === "recurring_deposit" && (
                          <RDValuation data={asset.data as Record<string, unknown>} />
                        )}
                        {asset.assetType === "provident_fund" && (
                          <PFValuation data={asset.data as Record<string, unknown>} />
                        )}
                      </div>
                      {(!isAdmin || selectedMemberId === null) && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const data: Record<string, string> = {};
                            Object.entries(asset.data as Record<string, unknown>).forEach(([k, v]) => { data[k] = String(v); });
                            setAssetDialog({ type: asset.assetType, data, editId: asset.id });
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAsset(asset.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ));
            })()}
          </div>

          <hr className="border-t border-muted" />

          {/* Liabilities Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {selectedMemberId === null ? "My Liabilities" : `${familyMembers?.find(m => m.id === selectedMemberId)?.name}'s Liabilities`} 
                ({liabilities?.filter(l => (l.familyMemberId ?? null) === (selectedMemberId ?? null)).length ?? 0})
              </h2>
              {(!isAdmin || selectedMemberId === null) && (
                <Button size="sm" variant="destructive" className="gap-2" onClick={() => setLiabilityDialog({ 
                  liabilityType: "Loans", 
                  // ... rest of empty state
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
              )}
            </div>
            {(() => {
              const filteredLiabilities = liabilities?.filter(l => (l.familyMemberId ?? null) === (selectedMemberId ?? null)) ?? [];
              if (filteredLiabilities.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No liabilities yet</CardContent></Card>;
              
              return filteredLiabilities.map((liability) => (
                <Card key={liability.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="destructive" className="text-xs mb-2">
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
                        <p className="text-base font-bold text-foreground">{liability.lenderName}</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                          {(() => {
                            const parts = liability.notes?.split("|") ?? [];
                            const type = parts[0];
                            if (type === "Taxes") {
                              const inc = parts.find(p => p.startsWith("Income:"))?.split(":")[1] ?? "0";
                              const tds = parts.find(p => p.startsWith("TDS:"))?.split(":")[1] ?? "0";
                              const adv = parts.find(p => p.startsWith("Advance:"))?.split(":")[1] ?? "0";
                              return (
                                <>
                                  <p>Net Tax Payable: <span className="text-foreground font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                  <p>Outstanding: <span className="text-red-600 font-medium">{formatCurrency(liability.outstandingAmount)}</span></p>
                                  <p>Annual Income: <span className="text-foreground font-medium">{formatCurrency(parseFloat(inc))}</span></p>
                                  <p>TDS Paid: <span className="text-foreground font-medium">{formatCurrency(parseFloat(tds))}</span></p>
                                  {adv !== "0" && <p>Advance Tax: <span className="text-foreground font-medium">{formatCurrency(parseFloat(adv))}</span></p>}
                                  {liability.startDate && <p>Due Date: {formatDate(liability.startDate)}</p>}
                                </>
                              );
                            }
                            if (type === "Bills") {
                              return (
                                <>
                                  <p>Original Bill: <span className="text-foreground font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                  <p>Current Outstanding: <span className="text-red-600 font-medium">{formatCurrency(liability.outstandingAmount)}</span></p>
                                  <p>Penalty Rate: <span className="text-foreground font-medium">{liability.interestRate}%</span></p>
                                  {liability.startDate && <p>Due Date: {formatDate(liability.startDate)}</p>}
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
                                  <p>Total Premium: <span className="text-foreground font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                  <p>Amount Due: <span className="text-red-600 font-medium">{formatCurrency(liability.outstandingAmount)}</span></p>
                                  {prem && <p>Annual Premium: <span className="text-foreground font-medium">{formatCurrency(parseFloat(prem))}</span></p>}
                                  {yrs && <p>Tenure: <span className="text-foreground font-medium">{yrs} yrs</span></p>}
                                  {sub && <p>Type: <span className="text-foreground font-medium">{sub}</span></p>}
                                  {liability.startDate && <p>Start: {formatDate(liability.startDate)}</p>}
                                </>
                              );
                            }
                             if (type === "Household Obligations") {
                               const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1];
                               return (
                                 <>
                                   <p>Monthly Amount: <span className="text-foreground font-bold">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                   {cat && <p>Category: <span className="font-medium">{cat}</span></p>}
                                   {liability.startDate && <p>Start Date: {formatDate(liability.startDate)}</p>}
                                   {liability.endDate && <p>End Date: {formatDate(liability.endDate)}</p>}
                                 </>
                               );
                             }
                            return (
                              <>
                                <p>Total: <span className="text-foreground font-medium">{formatCurrency(liability.totalLoanAmount)}</span></p>
                                <p>Outstanding: <span className="text-red-600 font-medium">{formatCurrency(liability.outstandingAmount)}</span></p>
                                <p>Interest: <span className="text-foreground font-medium">{liability.interestRate}%</span></p>
                                <p>EMI: <span className="text-foreground font-medium">{formatCurrency(liability.emi)}</span></p>
                                {liability.startDate && <p>Start: {formatDate(liability.startDate)}</p>}
                                {liability.endDate && <p>End: {formatDate(liability.endDate)}</p>}
                              </>
                            );
                          })()}
                        </div>
                        {(!liability.notes?.startsWith("Taxes") && !liability.notes?.startsWith("Bills") && !liability.notes?.startsWith("Insurance Dues") && (liability.loanType === "home_loan" || liability.loanType === "car_loan" || liability.loanType === "personal_loan" || liability.loanType === "business_loan" || liability.loanType === "education_loan" || liability.notes?.startsWith("Loans") || liability.notes?.startsWith("Credit Cards & BNPL") || liability.notes?.startsWith("EMIs"))) && (
                          <LoanValuation liability={liability} />
                        )}
                      </div>
                      {(!isAdmin || selectedMemberId === null) && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const parts = liability.notes?.split("|") ?? [];
                            const start = liability.startDate ? new Date(liability.startDate) : null;
                            const end = liability.endDate ? new Date(liability.endDate) : null;
                            const months = (start && end) ? (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) : 0;
                            
                            setLiabilityDialog({
                              loanType: liability.loanType,
                              liabilityType: parts[0] ?? "Loans",
                              interestType: liability.notes?.includes("|Flat") ? "Flat" : "Reducing",
                              subType: parts.length > 1 && parts[parts.length-1] !== "Flat" ? parts[parts.length-1] : "",
                              lenderName: liability.lenderName,
                              totalLoanAmount: String(liability.totalLoanAmount),
                              outstandingAmount: String(liability.outstandingAmount),
                              interestRate: String(liability.interestRate),
                              emi: String(liability.emi),
                              startDate: liability.startDate ?? "",
                              endDate: liability.endDate ?? "",
                              tenure: months > 0 ? (months / 12).toFixed(1) : "",
                              income: parts.find((p: string) => p.startsWith("Income:"))?.split(":")[1] ?? "",
                              tds: parts.find((p: string) => p.startsWith("TDS:"))?.split(":")[1] ?? "",
                              advanceTax: parts.find((p: string) => p.startsWith("Advance:"))?.split(":")[1] ?? "",
                              standardDeduction: parts.find((p: string) => p.startsWith("StdDed:"))?.split(":")[1] ?? "75000",
                              insuranceCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "",
                              insuranceSubtype: parts.find((p: string) => p.startsWith("Sub:"))?.split(":")[1] ?? "",
                              propertyValue: "",
                              insuranceRate: "",
                              premium: parts.find((p: string) => p.startsWith("Premium:"))?.split(":")[1] ?? "",
                              tenureYears: parts.find((p: string) => p.startsWith("Years:"))?.split(":")[1] ?? "",
                              baseRate: parts.find((p: string) => p.startsWith("Base:"))?.split(":")[1] ?? "",
                              addOns: parts.find((p: string) => p.startsWith("Addons:"))?.split(":")[1] ?? "",
                              discounts: parts.find((p: string) => p.startsWith("Disc:"))?.split(":")[1] ?? "",
                              householdCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "",
                              householdAmount: parts.find((p: string) => p.startsWith("Amt:"))?.split(":")[1] ?? "",
                              rent: parts.find((p: string) => p.startsWith("Rent:"))?.split(":")[1] ?? "",
                              maintenance: parts.find((p: string) => p.startsWith("Maint:"))?.split(":")[1] ?? "",
                              taxes: parts.find((p: string) => p.startsWith("Taxes:"))?.split(":")[1] ?? "",
                              electricity: parts.find((p: string) => p.startsWith("Elec:"))?.split(":")[1] ?? "",
                              water: parts.find((p: string) => p.startsWith("Water:"))?.split(":")[1] ?? "",
                              gas: parts.find((p: string) => p.startsWith("Gas:"))?.split(":")[1] ?? "",
                              internet: parts.find((p: string) => p.startsWith("Net:"))?.split(":")[1] ?? "",
                              groceries: parts.find((p: string) => p.startsWith("Groc:"))?.split(":")[1] ?? "",
                              fees: parts.find((p: string) => p.startsWith("Fees:"))?.split(":")[1] ?? "",
                              books: parts.find((p: string) => p.startsWith("Books:"))?.split(":")[1] ?? "",
                              academicCosts: parts.find((p: string) => p.startsWith("Acad:"))?.split(":")[1] ?? "",
                              maidSalary: parts.find((p: string) => p.startsWith("Maid:"))?.split(":")[1] ?? "",
                              cookSalary: parts.find((p: string) => p.startsWith("Cook:"))?.split(":")[1] ?? "",
                              serviceCosts: parts.find((p: string) => p.startsWith("Serv:"))?.split(":")[1] ?? "",
                              medicalBills: parts.find((p: string) => p.startsWith("MedB:"))?.split(":")[1] ?? "",
                              medicines: parts.find((p: string) => p.startsWith("MedI:"))?.split(":")[1] ?? "",
                              miscCosts: parts.find((p: string) => p.startsWith("Misc:"))?.split(":")[1] ?? "",
                              editId: liability.id,
                            });
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLiability(liability.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ));
            })()}
          </div>
        </div>
      </div>

      <Dialog open={!!assetDialog} onOpenChange={(open) => !open && setAssetDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{assetDialog?.editId ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>
          {assetDialog && (
            <div className="space-y-4">
              {!assetDialog.editId && (
                <div>
                  <Label>Asset Type</Label>
                  <Select value={assetDialog.type} onValueChange={(v) => { setAssetDialog({ type: v, data: {} }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {assetDialog.type === "mutual_fund" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Asset Name</Label>
                    <FundAutocomplete
                      value={assetDialog.data.assetName ?? ""}
                      onChange={(v) => updateAssetField("assetName", v)}
                    />
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label className="text-xs">Asset Name</Label><StockAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} /></div>
                  <div><Label className="text-xs">Transaction Type</Label>
                    <Select value={assetDialog.data.transactionType ?? "Buy"} onValueChange={(v) => updateAssetField("transactionType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Date</Label><Input type="date" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} /></div>
                  <div><Label className="text-xs">Units</Label><Input type="number" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} /></div>
                  <div><Label className="text-xs">Price</Label><Input type="number" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-xs">Amount (auto)</Label><Input readOnly value={assetDialog.data.amount ?? "0"} className="bg-muted" /></div>
                </div>
              )}
              {assetDialog.type === "fixed_deposit" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label className="text-xs">Institution</Label><Input value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} /></div>
                  <div><Label className="text-xs">Investment Amount</Label><Input type="number" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} /></div>
                  <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                  <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                  <div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-xs">Payout Type</Label>
                    <Select value={assetDialog.data.payoutType ?? "Annual"} onValueChange={(v) => updateAssetField("payoutType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Annual">Annual</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Quarterly">Quarterly</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {assetDialog.type === "recurring_deposit" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label className="text-xs">Institution</Label><Input value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} /></div>
                  <div><Label className="text-xs">Monthly Investment</Label><Input type="number" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} /></div>
                  <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                  <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                  <div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div>
                </div>
              )}
              {assetDialog.type === "provident_fund" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Account Type</Label>
                    <Select value={assetDialog.data.accountType ?? "PPF"} onValueChange={(v) => updateAssetField("accountType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="PPF">PPF</SelectItem><SelectItem value="EPF">EPF</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {assetDialog.data.accountType === "EPF" ? (
                    <>
                      <div><Label className="text-xs">Your Age</Label><Input type="number" placeholder="e.g. 30" value={assetDialog.data.age ?? ""} onChange={(e) => updateAssetField("age", e.target.value)} /></div>
                      <div><Label className="text-xs">Basic Salary (monthly)</Label><Input type="number" value={assetDialog.data.basicSalary ?? ""} onChange={(e) => updateAssetField("basicSalary", e.target.value)} /></div>
                      <div><Label className="text-xs">Dearness Allowance (monthly)</Label><Input type="number" value={assetDialog.data.dearnessAllowance ?? ""} onChange={(e) => updateAssetField("dearnessAllowance", e.target.value)} /></div>
                      <div><Label className="text-xs">Contribution (%)</Label><Input type="number" placeholder="12" value={assetDialog.data.employeeContributionPercent ?? ""} onChange={(e) => updateAssetField("employeeContributionPercent", e.target.value)} /></div>
                      <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" placeholder="8.15" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                      <div><Label className="text-xs">Investment Duration (years)</Label><Input type="number" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div>
                      <div><Label className="text-xs">Current EPF Balance (optional)</Label><Input type="number" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} /></div>
                      <div><Label className="text-xs">Annual increase in salary (%) (optional)</Label><Input type="number" value={assetDialog.data.salaryGrowth ?? ""} onChange={(e) => updateAssetField("salaryGrowth", e.target.value)} /></div>
                    </>
                  ) : (
                    <>
                      <div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div>
                      <div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div>
                      <div><Label className="text-xs">Annual Contribution (Yearly deposit)</Label><Input type="number" value={assetDialog.data.totalContribution ?? ""} onChange={(e) => updateAssetField("totalContribution", e.target.value)} /></div>
                      <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div>
                    </>
                  )}
                </div>
              )}
              {assetDialog.type === "cash_bank" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Bank Name</Label><Input value={assetDialog.data.bankName ?? ""} onChange={(e) => updateAssetField("bankName", e.target.value)} /></div>
                  <div><Label className="text-xs">Account Type</Label>
                    <Select value={assetDialog.data.accountType ?? "Savings"} onValueChange={(v) => updateAssetField("accountType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Savings">Savings</SelectItem><SelectItem value="Current">Current</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2"><Label className="text-xs">Current Balance</Label><Input type="number" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} /></div>
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
        <DialogContent className="max-w-lg">
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
                <Select value={familyMemberDialog?.relation ?? "Child"} onValueChange={(val: any) => setFamilyMemberDialog(prev => prev ? { ...prev, relation: val } : null)}>
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
