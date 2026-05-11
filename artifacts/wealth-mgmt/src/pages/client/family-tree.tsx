import { useState } from "react";
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
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { FundAutocomplete } from "@/components/fund-autocomplete";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { MutualFundNav } from "@/components/mutual-fund-nav";
import { StockPriceDisplay } from "@/components/stock-price-display";
import { FDValuation, RDValuation, PFValuation, calculateEMI, LoanValuation, calculateIncomeTax, calculatePFCurrentValue, calculateMFCurrentValue, SIPValuation, SWPValuation, STPValuation } from "@/components/fixed-income-valuation";
import { AnimatedFeatureSpotlight3D } from "@/components/ui/animated-feature-spotlight3d";
import { Sparkles } from "lucide-react";

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

export default function ClientFamilyTreePage() {
  const { data: user } = useGetMe({ query: { retry: false, queryKey: ["me"] } as any });
  const clientId = user?.clientId;
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

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

  const [memberDialog, setMemberDialog] = useState<{ name: string; relation: "Parent" | "Spouse" | "Child"; dob: string; phone: string; editId?: number } | null>(null);
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

  return (
    <Layout>
      <div className="space-y-8">
        <AnimatedFeatureSpotlight3D
          className="bg-primary/5 border-primary/20 py-8"
          preheaderIcon={<Sparkles className="w-4 h-4 text-primary" />}
          preheaderText="Family Legacy"
          heading={
            <>
              Manage Your <span className="text-primary">Family Tree</span>
            </>
          }
          description={`Your current net worth is ${formatCurrency(summary?.netWorth ?? 0)}. You have ${filteredAssets.length} active assets and ${filteredLiabilities.length} liabilities tracked.`}
          buttonText="View Detailed Report"
          imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000"
          imageAlt="Portfolio Performance"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Family Tree</h1><p className="text-sm text-muted-foreground mt-1">Manage your family member details and financial records</p></div>
          <Button className="gap-2" onClick={() => setMemberDialog({ name: "", relation: "Child", dob: "", phone: "" })}><Plus className="h-4 w-4" /> Add Family Member</Button>
        </div>

        <FamilyTree 
          client={{ id: clientId!, name: user?.name ?? "Me" }}
          familyMembers={familyMembers ?? []}
          assets={assets ?? []}
          liabilities={liabilities ?? []}
          selectedMemberId={selectedMemberId}
          onSelectMember={(m) => setSelectedMemberId(m?.id ?? null)}
          onAddMember={(rel) => setMemberDialog({ name: "", relation: rel || "Child", dob: "", phone: "" })}
          onEditMember={(m) => setMemberDialog({ name: m.name, relation: m.relation as any, dob: m.dob || "", phone: m.phone || "", editId: m.id })}
          onDeleteMember={(id) => {
            if (confirm("Delete this family member? This will also remove their assets and liabilities.")) {
              deleteFamilyMember.mutateAsync({ clientId: clientId!, familyMemberId: id }).then(invalidate);
            }
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{selectedMemberId ? familyMembers?.find(m => m.id === selectedMemberId)?.name : "My"} Assets</h2>
                <Button size="sm" className="gap-2" onClick={() => setAssetDialog({ type: "mutual_fund", data: {} })}><Plus className="h-4 w-4" /> Add Asset</Button>
              </div>
              <Card><CardContent className="space-y-3 pt-6">{filteredAssets.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No assets recorded</p> : filteredAssets.map((asset) => (
                <div key={asset.id} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0"><Badge variant="secondary" className="text-xs mb-1">{ASSET_LABELS[asset.assetType]}</Badge>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(getDisplayValue(asset))}
                      </p>
                      <div className="text-[10px] text-muted-foreground space-y-1 mt-2 bg-muted/20 p-2 rounded">
                        {Object.entries(asset.data as Record<string, any>).map(([k, v]) => {
                          const skip = ["amount", "basicSalary", "dearnessAllowance", "employeeContributionPercent", "employerContributionPercent", "interestRate", "tenureYears", "currentBalance", "salaryGrowth", "includeEPS", "totalContribution", "startDate", "maturityDate", "monthlyInvestment", "investmentAmount", "institutionName", "payoutType", "age"].includes(k);
                          return !skip && <p key={k} className="flex justify-between border-b border-border/50 last:border-0 py-0.5"><span className="capitalize opacity-70">{k.replace(/([A-Z])/g, " $1")}</span><span className="font-medium">{String(v)}</span></p>;
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
                      {asset.assetType === "stock" && (asset.data as any).assetName && <StockPriceDisplay stockName={(asset.data as any).assetName} units={parseFloat((asset.data as any).units ?? "0")} investmentAmount={parseFloat((asset.data as any).amount ?? "0")} />}
                      {asset.assetType === "fixed_deposit" && <FDValuation data={asset.data as any} />}{asset.assetType === "recurring_deposit" && <RDValuation data={asset.data as any} />}{asset.assetType === "provident_fund" && <PFValuation data={asset.data as any} />}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4"><p className="text-base font-bold text-green-700 whitespace-nowrap">{formatCurrency(getDisplayValue(asset))}</p><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const data: Record<string, string> = {}; Object.entries(asset.data as Record<string, unknown>).forEach(([k, v]) => { data[k] = String(v); }); setAssetDialog({ type: asset.assetType, data, editId: asset.id }); }}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if(confirm("Delete asset?")) deleteAsset.mutateAsync({ clientId: clientId!, assetId: asset.id }).then(invalidate); }}><Trash2 className="h-3 w-3" /></Button></div></div>
                  </div>
                </div>
              ))}</CardContent></Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedMemberId ? familyMembers?.find(m => m.id === selectedMemberId)?.name : "My"} Liabilities</h2>
                <Button size="sm" variant="destructive" className="gap-2" onClick={() => setLiabilityDialog({ liabilityType: "Loans", loanType: "home_loan", lenderName: "", totalLoanAmount: "", outstandingAmount: "", interestRate: "", emi: "", startDate: "", endDate: "", interestType: "Reducing", subType: "", tenure: "", income: "", tds: "", advanceTax: "", standardDeduction: "75000", insuranceCategory: "", insuranceSubtype: "", propertyValue: "", insuranceRate: "", premium: "", tenureYears: "", baseRate: "", addOns: "", discounts: "", householdCategory: "", householdAmount: "", rent: "", maintenance: "", taxes: "", electricity: "", water: "", gas: "", internet: "", groceries: "", fees: "", books: "", academicCosts: "", maidSalary: "", cookSalary: "", serviceCosts: "", medicalBills: "", medicines: "", miscCosts: "" })}><Plus className="h-4 w-4" /> Add Liability</Button>
              </div>
              <Card><CardContent className="space-y-3 pt-6">{filteredLiabilities.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No liabilities recorded</p> : filteredLiabilities.map((liability) => (
                <div key={liability.id} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Badge variant="destructive" className="text-xs mb-1">
                        {(() => { const parts = liability.notes?.split("|") ?? []; const type = parts[0]; const subType = parts[parts.length - 1]; if (type === "Loans") return LOAN_LABELS[liability.loanType]; if (type === "Bills" && subType && subType !== "Bills") return `Bills - ${subType}`; if (type === "Insurance Dues") { const cat = parts.find(p => p.startsWith("Cat:"))?.split(":")[1]; const sub = parts.find(p => p.startsWith("Sub:"))?.split(":")[1]; return sub ? `${cat} - ${sub}` : (cat ?? "Insurance"); } return type || LOAN_LABELS[liability.loanType]; })()}
                      </Badge>
                      <p className="text-sm font-medium text-foreground truncate">{liability.lenderName}</p>
                      <div className="text-[10px] text-muted-foreground mt-2 space-y-1 bg-muted/20 p-2 rounded">
                        <p className="flex justify-between border-b border-border/50 py-0.5"><span>Total Liability</span><span>{formatCurrency(liability.totalLoanAmount)}</span></p>
                        <p className="flex justify-between border-b border-border/50 py-0.5"><span>Outstanding</span><span className="text-red-600">{formatCurrency(liability.outstandingAmount)}</span></p>
                        <p className="flex justify-between border-b border-border/50 py-0.5"><span>Rate</span><span>{liability.interestRate}%</span></p>
                        <p className="flex justify-between last:border-0 py-0.5"><span>EMI</span><span>{formatCurrency(liability.emi)}</span></p>
                      </div>
                      <LoanValuation liability={liability} />
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4"><p className="text-base font-bold text-red-600 whitespace-nowrap">{formatCurrency(liability.outstandingAmount)}</p><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const parts = liability.notes?.split("|") ?? []; const start = liability.startDate ? new Date(liability.startDate) : null; const end = liability.endDate ? new Date(liability.endDate) : null; const months = (start && end) ? (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) : 0; setLiabilityDialog({ loanType: liability.loanType, liabilityType: parts[0] ?? "Loans", interestType: liability.notes?.includes("|Flat") ? "Flat" : "Reducing", subType: parts.length > 1 && parts[parts.length-1] !== "Flat" ? parts[parts.length-1] : "", lenderName: liability.lenderName, totalLoanAmount: String(liability.totalLoanAmount), outstandingAmount: String(liability.outstandingAmount), interestRate: String(liability.interestRate), emi: String(liability.emi), startDate: liability.startDate ?? "", endDate: liability.endDate ?? "", tenure: months > 0 ? (months / 12).toFixed(1) : "", income: parts.find((p: string) => p.startsWith("Income:"))?.split(":")[1] ?? "", tds: parts.find((p: string) => p.startsWith("TDS:"))?.split(":")[1] ?? "", advanceTax: parts.find((p: string) => p.startsWith("Advance:"))?.split(":")[1] ?? "", standardDeduction: parts.find((p: string) => p.startsWith("StdDed:"))?.split(":")[1] ?? "75000", insuranceCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "", insuranceSubtype: parts.find((p: string) => p.startsWith("Sub:"))?.split(":")[1] ?? "", propertyValue: "", insuranceRate: "", premium: parts.find((p: string) => p.startsWith("Premium:"))?.split(":")[1] ?? "", tenureYears: parts.find((p: string) => p.startsWith("Years:"))?.split(":")[1] ?? "", baseRate: parts.find((p: string) => p.startsWith("Base:"))?.split(":")[1] ?? "", addOns: parts.find((p: string) => p.startsWith("Addons:"))?.split(":")[1] ?? "", discounts: parts.find((p: string) => p.startsWith("Disc:"))?.split(":")[1] ?? "", householdCategory: parts.find((p: string) => p.startsWith("Cat:"))?.split(":")[1] ?? "", householdAmount: parts.find((p: string) => p.startsWith("Amt:"))?.split(":")[1] ?? "", rent: parts.find((p: string) => p.startsWith("Rent:"))?.split(":")[1] ?? "", maintenance: parts.find((p: string) => p.startsWith("Maint:"))?.split(":")[1] ?? "", taxes: parts.find((p: string) => p.startsWith("Taxes:"))?.split(":")[1] ?? "", electricity: parts.find((p: string) => p.startsWith("Elec:"))?.split(":")[1] ?? "", water: parts.find((p: string) => p.startsWith("Water:"))?.split(":")[1] ?? "", gas: parts.find((p: string) => p.startsWith("Gas:"))?.split(":")[1] ?? "", internet: parts.find((p: string) => p.startsWith("Net:"))?.split(":")[1] ?? "", groceries: parts.find((p: string) => p.startsWith("Groc:"))?.split(":")[1] ?? "", fees: parts.find((p: string) => p.startsWith("Fees:"))?.split(":")[1] ?? "", books: parts.find((p: string) => p.startsWith("Books:"))?.split(":")[1] ?? "", academicCosts: parts.find((p: string) => p.startsWith("Acad:"))?.split(":")[1] ?? "", maidSalary: parts.find((p: string) => p.startsWith("Maid:"))?.split(":")[1] ?? "", cookSalary: parts.find((p: string) => p.startsWith("Cook:"))?.split(":")[1] ?? "", serviceCosts: parts.find((p: string) => p.startsWith("Serv:"))?.split(":")[1] ?? "", medicalBills: parts.find((p: string) => p.startsWith("MedB:"))?.split(":")[1] ?? "", medicines: parts.find((p: string) => p.startsWith("MedI:"))?.split(":")[1] ?? "", miscCosts: parts.find((p: string) => p.startsWith("Misc:"))?.split(":")[1] ?? "", editId: liability.id }); }}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if(confirm("Delete liability?")) deleteLiability.mutateAsync({ clientId: clientId!, liabilityId: liability.id }).then(invalidate); }}><Trash2 className="h-3 w-3" /></Button></div></div>
                </div>
              </div>
            ))}</CardContent></Card>
          </div>
        </div>
      </div>

      <Dialog open={!!memberDialog} onOpenChange={(open) => !open && setMemberDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>{memberDialog?.editId ? "Edit Family Member" : "Add Family Member"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">{memberDialog && (<><div className="space-y-2"><Label>Name</Label><Input value={memberDialog.name} onChange={(e) => setMemberDialog({ ...memberDialog, name: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Relation</Label><Select value={memberDialog.relation} onValueChange={(val: any) => setMemberDialog({ ...memberDialog, relation: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Parent">Parent</SelectItem><SelectItem value="Spouse">Spouse</SelectItem><SelectItem value="Child">Child</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>DOB</Label><Input type="date" value={memberDialog.dob} onChange={(e) => setMemberDialog({ ...memberDialog, dob: e.target.value })} /></div></div><div className="space-y-2"><Label>Mobile Number</Label><Input value={memberDialog.phone} onChange={(e) => setMemberDialog({ ...memberDialog, phone: e.target.value })} /></div></>)}</div>
        <DialogFooter><Button variant="outline" onClick={() => setMemberDialog(null)}>Cancel</Button><Button onClick={() => { if (memberDialog.editId) updateFamilyMember.mutateAsync({ clientId: clientId!, familyMemberId: memberDialog.editId, data: memberDialog }).then(() => { invalidate(); setMemberDialog(null); }); else createFamilyMember.mutateAsync({ clientId: clientId!, data: memberDialog }).then(() => { invalidate(); setMemberDialog(null); }); }}>Save</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!assetDialog} onOpenChange={(open) => !open && setAssetDialog(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{assetDialog?.editId ? "Edit Asset" : "Add Asset"}</DialogTitle></DialogHeader>
        {assetDialog && (<div className="space-y-4">{!assetDialog.editId && (<div><Label>Asset Type</Label><Select value={assetDialog.type} onValueChange={(v) => { setAssetDialog({ type: v, data: {} }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>)}
          {assetDialog.type === "mutual_fund" && (<div className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label className="text-xs">Asset Name</Label><FundAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} /></div><div><Label className="text-xs">Transaction Type</Label><Select value={assetDialog.data.transactionType ?? "Buy"} onValueChange={(v) => updateAssetField("transactionType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent></Select></div><div><Label className="text-xs">Date</Label><Input type="date" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} /></div><div><Label className="text-xs">Units</Label><Input type="number" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} /></div><div><Label className="text-xs">Price</Label><Input type="number" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} /></div><div className="col-span-2"><Label className="text-xs">Amount (auto)</Label><Input readOnly value={assetDialog.data.amount ?? "0"} className="bg-muted" /></div></div>)}
          {assetDialog.type === "stock" && (<div className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label className="text-xs">Asset Name</Label><StockAutocomplete value={assetDialog.data.assetName ?? ""} onChange={(v) => updateAssetField("assetName", v)} /></div><div><Label className="text-xs">Transaction Type</Label><Select value={assetDialog.data.transactionType ?? "Buy"} onValueChange={(v) => updateAssetField("transactionType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent></Select></div><div><Label className="text-xs">Date</Label><Input type="date" value={assetDialog.data.date ?? ""} onChange={(e) => updateAssetField("date", e.target.value)} /></div><div><Label className="text-xs">Units</Label><Input type="number" value={assetDialog.data.units ?? ""} onChange={(e) => updateAssetField("units", e.target.value)} /></div><div><Label className="text-xs">Price</Label><Input type="number" value={assetDialog.data.price ?? ""} onChange={(e) => updateAssetField("price", e.target.value)} /></div><div className="col-span-2"><Label className="text-xs">Amount (auto)</Label><Input readOnly value={assetDialog.data.amount ?? "0"} className="bg-muted" /></div></div>)}
          {assetDialog.type === "fixed_deposit" && (<div className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label className="text-xs">Institution</Label><Input value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} /></div><div><Label className="text-xs">Investment Amount</Label><Input type="number" value={assetDialog.data.investmentAmount ?? ""} onChange={(e) => updateAssetField("investmentAmount", e.target.value)} /></div><div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div><div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div><div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div><div className="col-span-2"><Label className="text-xs">Payout Type</Label><Select value={assetDialog.data.payoutType ?? "Cumulative"} onValueChange={(v) => updateAssetField("payoutType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cumulative">Cumulative</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Quarterly">Quarterly</SelectItem></SelectContent></Select></div></div>)}
          {assetDialog.type === "recurring_deposit" && (<div className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label className="text-xs">Institution</Label><Input value={assetDialog.data.institutionName ?? ""} onChange={(e) => updateAssetField("institutionName", e.target.value)} /></div><div><Label className="text-xs">Monthly Investment</Label><Input type="number" value={assetDialog.data.monthlyInvestment ?? ""} onChange={(e) => updateAssetField("monthlyInvestment", e.target.value)} /></div><div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div><div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div><div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div></div>)}
          {assetDialog.type === "provident_fund" && (<div className="grid grid-cols-2 gap-3"><div><Label className="text-xs">Account Type</Label><Select value={assetDialog.data.accountType ?? "PPF"} onValueChange={(v) => updateAssetField("accountType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PPF">PPF</SelectItem><SelectItem value="EPF">EPF</SelectItem></SelectContent></Select></div>{assetDialog.data.accountType === "EPF" ? (<><div className="col-span-2 grid grid-cols-2 gap-3"><div><Label className="text-xs">Basic Salary (monthly)</Label><Input type="number" value={assetDialog.data.basicSalary ?? ""} onChange={(e) => updateAssetField("basicSalary", e.target.value)} /></div><div><Label className="text-xs">Dearness Allowance (monthly)</Label><Input type="number" value={assetDialog.data.dearnessAllowance ?? ""} onChange={(e) => updateAssetField("dearnessAllowance", e.target.value)} /></div><div><Label className="text-xs">Contribution (%)</Label><Input type="number" placeholder="12" value={assetDialog.data.employeeContributionPercent ?? ""} onChange={(e) => updateAssetField("employeeContributionPercent", e.target.value)} /></div><div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" placeholder="8.15" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div><div><Label className="text-xs">Investment Duration (years)</Label><Input type="number" value={assetDialog.data.tenureYears ?? ""} onChange={(e) => updateAssetField("tenureYears", e.target.value)} /></div><div><Label className="text-xs">Current EPF Balance (optional)</Label><Input type="number" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} /></div><div><Label className="text-xs">Annual Salary Growth (%) (optional)</Label><Input type="number" value={assetDialog.data.salaryGrowth ?? ""} onChange={(e) => updateAssetField("salaryGrowth", e.target.value)} /></div></div></>) : (<><div className="col-span-2 grid grid-cols-2 gap-3"><div><Label className="text-xs">Start Date</Label><Input type="date" value={assetDialog.data.startDate ?? ""} onChange={(e) => updateAssetField("startDate", e.target.value)} /></div><div><Label className="text-xs">Maturity Date</Label><Input type="date" value={assetDialog.data.maturityDate ?? ""} onChange={(e) => updateAssetField("maturityDate", e.target.value)} /></div><div><Label className="text-xs">Annual Contribution (Yearly deposit)</Label><Input type="number" value={assetDialog.data.totalContribution ?? ""} onChange={(e) => updateAssetField("totalContribution", e.target.value)} /></div><div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" value={assetDialog.data.interestRate ?? ""} onChange={(e) => updateAssetField("interestRate", e.target.value)} /></div></div></>)}</div>)}
          {assetDialog.type === "cash_bank" && (<div className="grid grid-cols-2 gap-3"><div><Label className="text-xs">Bank Name</Label><Input value={assetDialog.data.bankName ?? ""} onChange={(e) => updateAssetField("bankName", e.target.value)} /></div><div><Label className="text-xs">Account Type</Label><Select value={assetDialog.data.accountType ?? "Savings"} onValueChange={(v) => updateAssetField("accountType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Savings">Savings</SelectItem><SelectItem value="Current">Current</SelectItem></SelectContent></Select></div><div className="col-span-2"><Label className="text-xs">Current Balance</Label><Input type="number" value={assetDialog.data.currentBalance ?? ""} onChange={(e) => updateAssetField("currentBalance", e.target.value)} /></div></div>)}
        </div>)}<DialogFooter><Button variant="outline" onClick={() => setAssetDialog(null)}>Cancel</Button><Button onClick={() => { if (assetDialog.editId) updateAssetMutation.mutateAsync({ clientId: clientId!, assetId: assetDialog.editId, data: { data: assetDialog.data, familyMemberId: selectedMemberId } }).then(() => { invalidate(); setAssetDialog(null); }); else createAsset.mutateAsync({ clientId: clientId!, data: { assetType: assetDialog.type as any, data: assetDialog.data, familyMemberId: selectedMemberId } }).then(() => { invalidate(); setAssetDialog(null); }); }}>Save</Button></DialogFooter></DialogContent>
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
