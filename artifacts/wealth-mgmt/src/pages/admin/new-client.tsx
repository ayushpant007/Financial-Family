import { useState } from "react";
import { useCreateClient, useCreateClientAsset, useCreateClientLiability, getListClientsQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CheckCircle2, Plus, Trash2, ArrowRight } from "lucide-react";
import { FundAutocomplete } from "@/components/fund-autocomplete";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { ScrollingFeatureShowcase } from "@/components/ui/interactive-scrolling-story-component";
import { usePageBackground } from "@/hooks/usePageBackground";

const NEW_CLIENT_SLIDES = [
  {
    title: "Onboard Clients in Minutes",
    description: "Set up a new family's complete financial profile — credentials, assets, and liabilities — through a guided two-step wizard.",
    image: "/assets/step1.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Capture Every Asset Class",
    description: "From mutual funds and stocks to fixed deposits, PPF, EPF, and cash balances — record the full picture of a family's wealth.",
    image: "/assets/assets.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Document All Obligations",
    description: "Log home loans, car loans, credit cards, insurance dues, and household obligations with auto-calculated EMIs and outstanding amounts.",
    image: "/assets/security.png",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

type Step = "account" | "onboarding";

interface AssetForm {
  type: string;
  data: Record<string, string>;
}

interface LiabilityForm {
  loanType: string;
  lenderName: string;
  totalLoanAmount: string;
  outstandingAmount: string;
  interestRate: string;
  emi: string;
  startDate: string;
  endDate: string;
}

function MutualFundForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Label className="text-xs text-slate-700">Asset Name</Label>
        <FundAutocomplete
          value={data.assetName ?? ""}
          onChange={(v) => onChange({ ...data, assetName: v })}
        />
      </div>
      <div className="col-span-2">
        <Label className="text-xs text-slate-700">Investment Method</Label>
        <Select value={data.investmentMethod ?? "Lump sum"} onValueChange={(v) => onChange({ ...data, investmentMethod: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem value="Lump sum">Lump sum</SelectItem>
            <SelectItem value="SIP">SIP (Systematic Investment Plan)</SelectItem>
            <SelectItem value="SWP">SWP (Systematic Withdrawal Plan)</SelectItem>
            <SelectItem value="STP">STP (Systematic Transfer Plan)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(!data.investmentMethod || data.investmentMethod === "Lump sum") ? (
        <>
          <div>
            <Label className="text-xs text-slate-700">Transaction Type</Label>
            <Select value={data.transactionType ?? "Buy"} onValueChange={(v) => onChange({ ...data, transactionType: v })}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-slate-200"><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs text-slate-700">Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.date ?? ""} onChange={(e) => onChange({ ...data, date: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Units</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900" value={data.units ?? ""} onChange={(e) => {
            const units = e.target.value;
            const price = data.price ?? "0";
            onChange({ ...data, units, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
          }} /></div>
          <div><Label className="text-xs text-slate-700">Price per Unit</Label><Input type="number" placeholder="0.00" className="bg-white border-slate-200 text-slate-900" value={data.price ?? ""} onChange={(e) => {
            const price = e.target.value;
            const units = data.units ?? "0";
            onChange({ ...data, price, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
          }} /></div>
          <div className="col-span-2">
            <Label className="text-xs text-slate-700">Amount (auto-calculated)</Label>
            <Input readOnly value={data.amount ?? "0.00"} className="bg-slate-50 text-slate-900 font-medium border-slate-200" />
          </div>
        </>
      ) : data.investmentMethod === "SIP" ? (
        <>
          <div><Label className="text-xs text-slate-700">Monthly SIP Amount</Label><Input type="number" placeholder="5000" className="bg-white border-slate-200 text-slate-900" value={data.monthlyInvestment ?? ""} onChange={(e) => onChange({ ...data, monthlyInvestment: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Expected Return (%)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Duration (years)</Label><Input type="number" placeholder="10" className="bg-white border-slate-200 text-slate-900" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
        </>
      ) : data.investmentMethod === "SWP" ? (
        <>
          <div><Label className="text-xs text-slate-700">Initial Investment</Label><Input type="number" placeholder="1000000" className="bg-white border-slate-200 text-slate-900" value={data.investmentAmount ?? ""} onChange={(e) => onChange({ ...data, investmentAmount: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Monthly Withdrawal</Label><Input type="number" placeholder="10000" className="bg-white border-slate-200 text-slate-900" value={data.monthlyWithdrawal ?? ""} onChange={(e) => onChange({ ...data, monthlyWithdrawal: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Expected Return (%)</Label><Input type="number" placeholder="8" className="bg-white border-slate-200 text-slate-900" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Duration (years)</Label><Input type="number" placeholder="10" className="bg-white border-slate-200 text-slate-900" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
        </>
      ) : (
        <>
          <div className="col-span-2"><Label className="text-xs text-slate-700">Target Fund Name</Label><Input placeholder="Fund to transfer into..." className="bg-white border-slate-200 text-slate-900" value={data.targetFundName ?? ""} onChange={(e) => onChange({ ...data, targetFundName: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Source Investment</Label><Input type="number" placeholder="500000" className="bg-white border-slate-200 text-slate-900" value={data.investmentAmount ?? ""} onChange={(e) => onChange({ ...data, investmentAmount: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Monthly Transfer</Label><Input type="number" placeholder="5000" className="bg-white border-slate-200 text-slate-900" value={data.monthlyTransfer ?? ""} onChange={(e) => onChange({ ...data, monthlyTransfer: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Source Return (%)</Label><Input type="number" placeholder="6" className="bg-white border-slate-200 text-slate-900" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Target Return (%)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900" value={data.targetInterestRate ?? ""} onChange={(e) => onChange({ ...data, targetInterestRate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Duration (years)</Label><Input type="number" placeholder="5" className="bg-white border-slate-200 text-slate-900" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
        </>
      )}
    </div>
  );
}

function StockForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Label className="text-xs text-slate-700">Asset Name</Label>
        <StockAutocomplete
          value={data.assetName ?? ""}
          onChange={(v) => onChange({ ...data, assetName: v })}
        />
      </div>
      <div>
        <Label className="text-xs text-slate-700">Transaction Type</Label>
        <Select value={data.transactionType ?? "Buy"} onValueChange={(v) => onChange({ ...data, transactionType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200"><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-slate-700">Date</Label>
        <Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.date ?? ""} onChange={(e) => onChange({ ...data, date: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs text-slate-700">Units</Label>
        <Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900" value={data.units ?? ""} onChange={(e) => {
          const units = e.target.value;
          const price = data.price ?? "0";
          onChange({ ...data, units, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
        }} />
      </div>
      <div>
        <Label className="text-xs text-slate-700">Price per Share</Label>
        <Input type="number" placeholder="0.00" className="bg-white border-slate-200 text-slate-900" value={data.price ?? ""} onChange={(e) => {
          const price = e.target.value;
          const units = data.units ?? "0";
          onChange({ ...data, price, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
        }} />
      </div>
      <div className="col-span-2">
        <Label className="text-xs text-slate-700">Amount (auto-calculated)</Label>
        <Input readOnly value={data.amount ?? "0.00"} className="bg-slate-50 text-slate-900 font-medium border-slate-200" />
      </div>
    </div>
  );
}

function FDForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label className="text-xs text-slate-700">Institution Name</Label><Input placeholder="e.g. SBI Bank" className="bg-white border-slate-200 text-slate-900" value={data.institutionName ?? ""} onChange={(e) => onChange({ ...data, institutionName: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Investment Amount</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900" value={data.investmentAmount ?? ""} onChange={(e) => onChange({ ...data, investmentAmount: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Interest Rate (%)</Label><Input type="number" placeholder="7.5" className="bg-white border-slate-200 text-slate-900" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Maturity Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.maturityDate ?? ""} onChange={(e) => onChange({ ...data, maturityDate: e.target.value })} /></div>
      <div className="col-span-2">
        <Label className="text-xs text-slate-700">Payout Type</Label>
        <Select value={data.payoutType ?? "Cumulative"} onValueChange={(v) => onChange({ ...data, payoutType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200"><SelectItem value="Cumulative">Cumulative</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Quarterly">Quarterly</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
  );
}

function RDForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label className="text-xs text-slate-700">Institution Name</Label><Input placeholder="e.g. HDFC Bank" className="bg-white border-slate-200 text-slate-900" value={data.institutionName ?? ""} onChange={(e) => onChange({ ...data, institutionName: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Monthly Investment</Label><Input type="number" placeholder="5000" className="bg-white border-slate-200 text-slate-900" value={data.monthlyInvestment ?? ""} onChange={(e) => onChange({ ...data, monthlyInvestment: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Interest Rate (%)</Label><Input type="number" placeholder="6.5" className="bg-white border-slate-200 text-slate-900" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
      <div><Label className="text-xs text-slate-700">Tenure (months)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900" value={data.tenure ?? ""} onChange={(e) => onChange({ ...data, tenure: e.target.value })} /></div>
    </div>
  );
}

function PPFForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs text-slate-700">Account Type</Label>
        <Select value={data.accountType ?? "PPF"} onValueChange={(v) => onChange({ ...data, accountType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200"><SelectItem value="PPF">PPF</SelectItem><SelectItem value="EPF">EPF</SelectItem></SelectContent>
        </Select>
      </div>
      {data.accountType === "EPF" ? (
        <>
          <div>
            <Label className="text-xs text-slate-700">Your Age</Label>
            <Input 
              type="number" 
              placeholder="e.g. 30" 
              className="bg-white border-slate-200 text-slate-900"
              value={data.age ?? ""} 
              onChange={(e) => {
                const age = parseInt(e.target.value) || 0;
                const newData = { ...data, age: e.target.value };
                if (age > 0 && age < 60) {
                  newData.tenureYears = String(60 - age);
                }
                onChange(newData);
              }} 
            />
          </div>
          <div><Label className="text-xs text-slate-700">Basic Salary (monthly)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={data.basicSalary ?? ""} onChange={(e) => onChange({ ...data, basicSalary: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Dearness Allowance (monthly)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={data.dearnessAllowance ?? ""} onChange={(e) => onChange({ ...data, dearnessAllowance: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Contribution (%)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900" value={data.employeeContributionPercent ?? ""} onChange={(e) => onChange({ ...data, employeeContributionPercent: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Interest Rate (%)</Label><Input type="number" placeholder="8.15" className="bg-white border-slate-200 text-slate-900" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Investment Duration (years)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Current EPF Balance (optional)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={data.currentBalance ?? ""} onChange={(e) => onChange({ ...data, currentBalance: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Annual increase in salary (%) (optional)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900" value={data.salaryGrowth ?? ""} onChange={(e) => onChange({ ...data, salaryGrowth: e.target.value })} /></div>
        </>
      ) : (
        <>
          <div><Label className="text-xs text-slate-700">Start Year</Label><Input type="number" placeholder="2020" className="bg-white border-slate-200 text-slate-900" value={data.startYear ?? ""} onChange={(e) => onChange({ ...data, startYear: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Total Contribution</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900" value={data.totalContribution ?? ""} onChange={(e) => onChange({ ...data, totalContribution: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-700">Interest Rate (%)</Label><Input type="number" placeholder="8.15" className="bg-white border-slate-200 text-slate-900" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
        </>
      )}
    </div>
  );
}

function CashBankForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div><Label className="text-xs text-slate-700">Bank Name</Label><Input placeholder="e.g. ICICI Bank" className="bg-white border-slate-200 text-slate-900" value={data.bankName ?? ""} onChange={(e) => onChange({ ...data, bankName: e.target.value })} /></div>
      <div>
        <Label className="text-xs text-slate-700">Account Type</Label>
        <Select value={data.accountType ?? "Savings"} onValueChange={(v) => onChange({ ...data, accountType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200"><SelectItem value="Savings">Savings</SelectItem><SelectItem value="Current">Current</SelectItem><SelectItem value="FD">Fixed Deposit</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="col-span-2"><Label className="text-xs text-slate-700">Current Balance</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900" value={data.currentBalance ?? ""} onChange={(e) => onChange({ ...data, currentBalance: e.target.value })} /></div>
    </div>
  );
}

const ASSET_TYPES = [
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "stock", label: "Stock" },
  { value: "fixed_deposit", label: "Fixed Deposit (FD)" },
  { value: "recurring_deposit", label: "Recurring Deposit (RD)" },
  { value: "provident_fund", label: "Provident Fund (PPF/EPF)" },
  { value: "cash_bank", label: "Cash / Bank Balance" },
];

const LOAN_TYPES = [
  { value: "home_loan", label: "Home Loan" },
  { value: "car_loan", label: "Car Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "education_loan", label: "Education Loan" },
  { value: "business_loan", label: "Business Loan" },
  { value: "other", label: "Other" },
];

export default function NewClientPage() {
  const [step, setStep] = useState<Step>("account");
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [assets, setAssets] = useState<AssetForm[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityForm[]>([]);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createClient = useCreateClient();
  const createAsset = useCreateClientAsset();
  const createLiability = useCreateClientLiability();

  usePageBackground('light');

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate(
      { data: { name, email: email || undefined, phone: phone || undefined, username, password } },
      {
        onSuccess: (client) => {
          setCreatedClientId(client.id);
          setClientName(client.name);
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setStep("onboarding");
        },
      }
    );
  };

  const addAsset = () => {
    setAssets([...assets, { type: "mutual_fund", data: {} }]);
  };

  const removeAsset = (i: number) => {
    setAssets(assets.filter((_, idx) => idx !== i));
  };

  const addLiability = () => {
    setLiabilities([...liabilities, { loanType: "home_loan", lenderName: "", totalLoanAmount: "", outstandingAmount: "", interestRate: "", emi: "", startDate: "", endDate: "" }]);
  };

  const removeLiability = (i: number) => {
    setLiabilities(liabilities.filter((_, idx) => idx !== i));
  };

  const handleFinish = async () => {
    if (!createdClientId) return;

    for (const asset of assets) {
      await createAsset.mutateAsync({
        clientId: createdClientId,
        data: { assetType: asset.type as any, data: asset.data },
      }).catch(() => {});
    }

    for (const liability of liabilities) {
      if (!liability.lenderName || !liability.totalLoanAmount) continue;
      await createLiability.mutateAsync({
        clientId: createdClientId,
        data: {
          loanType: liability.loanType as any,
          lenderName: liability.lenderName,
          totalLoanAmount: parseFloat(liability.totalLoanAmount),
          outstandingAmount: parseFloat(liability.outstandingAmount || "0"),
          interestRate: parseFloat(liability.interestRate || "0"),
          emi: parseFloat(liability.emi || "0"),
          startDate: liability.startDate || undefined,
          endDate: liability.endDate || undefined,
        },
      }).catch(() => {});
    }

    setLocation(`/admin/clients/${createdClientId}`);
  };

  const handleSkip = () => {
    if (createdClientId) setLocation(`/admin/clients/${createdClientId}`);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <ScrollingFeatureShowcase
          slides={NEW_CLIENT_SLIDES}
          height="380px"
        />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Client</h1>
          <p className="text-sm text-slate-500 mt-1">Create account then fill in financial details</p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-sm font-medium ${step === "account" ? "text-primary" : "text-slate-400"}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${step === "account" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
              {step === "onboarding" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : "1"}
            </div>
            Account
          </div>
          <ChevronRight className="h-4 w-4 text-slate-200" />
          <div className={`flex items-center gap-2 text-sm font-medium ${step === "onboarding" ? "text-primary" : "text-slate-400"}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${step === "onboarding" ? "bg-primary text-white" : "bg-slate-100"}`}>2</div>
            Financial Details
          </div>
        </div>

        {step === "account" && (
          <Card className="glass-panel border-slate-200 bg-white/60">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">Client Account Details</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Create login credentials for the client</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-slate-700">Full Name *</Label>
                    <Input placeholder="Client full name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Email</Label>
                    <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white border-slate-200 text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Phone</Label>
                    <Input placeholder="+91-..." value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white border-slate-200 text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Username *</Label>
                    <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Password *</Label>
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
                  </div>
                </div>
                {createClient.isError && (
                  <p className="text-sm text-rose-500">Error creating client. Username may already be taken.</p>
                )}
                <Button type="submit" className="w-full gap-2 shadow-lg shadow-primary/20 h-11" disabled={createClient.isPending}>
                  {createClient.isPending ? "Creating..." : "Create Account"}
                  {!createClient.isPending && <ChevronRight className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "onboarding" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-700">Account created for {clientName}</p>
              <p className="text-xs text-emerald-600/80 mt-0.5">Now add their financial data below (or skip to do it later)</p>
            </div>

            <Card className="glass-panel border-slate-200 bg-white/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base text-slate-900">Assets</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Add investments and holdings</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAsset} className="gap-1 border-slate-200 hover:bg-slate-50 text-slate-600">
                  <Plus className="h-4 w-4" /> Add Asset
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {assets.length === 0 && (
                  <p className="text-sm text-slate-400 py-4 text-center">No assets added yet. Click "Add Asset" to add one.</p>
                )}
                {assets.map((asset, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4 space-y-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <Select value={asset.type} onValueChange={(v) => {
                        const updated = [...assets];
                        updated[i] = { type: v, data: {} };
                        setAssets(updated);
                      }}>
                        <SelectTrigger className="w-56 bg-white border-slate-200 text-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAsset(i)} className="text-rose-500 hover:bg-rose-50 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {asset.type === "mutual_fund" && <MutualFundForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                    {asset.type === "stock" && <StockForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                    {asset.type === "fixed_deposit" && <FDForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                    {asset.type === "recurring_deposit" && <RDForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                    {asset.type === "provident_fund" && <PPFForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                    {asset.type === "cash_bank" && <CashBankForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-panel border-slate-200 bg-white/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base text-slate-900">Liabilities</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Add loans and outstanding debts</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addLiability} className="gap-1 border-slate-200 hover:bg-slate-50 text-slate-600">
                  <Plus className="h-4 w-4" /> Add Liability
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {liabilities.length === 0 && (
                  <p className="text-sm text-slate-400 py-4 text-center">No liabilities added yet.</p>
                )}
                {liabilities.map((liability, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4 space-y-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">Loan #{i + 1}</p>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLiability(i)} className="text-rose-500 hover:bg-rose-50 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-700">Loan Type</Label>
                        <Select value={liability.loanType} onValueChange={(v) => { const l = [...liabilities]; l[i] = { ...l[i], loanType: v }; setLiabilities(l); }}>
                          <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">{LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs text-slate-700">Lender Name</Label><Input placeholder="e.g. HDFC Bank" value={liability.lenderName} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], lenderName: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900" /></div>
                      <div><Label className="text-xs text-slate-700">Total Loan Amount</Label><Input type="number" placeholder="0" value={liability.totalLoanAmount} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], totalLoanAmount: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900" /></div>
                      <div><Label className="text-xs text-slate-700">Outstanding Amount</Label><Input type="number" placeholder="0" value={liability.outstandingAmount} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], outstandingAmount: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900" /></div>
                      <div><Label className="text-xs text-slate-700">Interest Rate (%)</Label><Input type="number" placeholder="8.5" value={liability.interestRate} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], interestRate: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900" /></div>
                      <div><Label className="text-xs text-slate-700">EMI</Label><Input type="number" placeholder="0" value={liability.emi} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], emi: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900" /></div>
                      <div><Label className="text-xs text-slate-700">Start Date</Label><Input type="date" value={liability.startDate} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], startDate: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900" /></div>
                      <div><Label className="text-xs text-slate-700">End Date</Label><Input type="date" value={liability.endDate} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], endDate: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900" /></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSkip} className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-600">
                Skip for now
              </Button>
              <Button onClick={handleFinish} className="flex-1 gap-2 shadow-lg shadow-primary/20 h-11" disabled={createAsset.isPending || createLiability.isPending}>
                Save & View Client <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
