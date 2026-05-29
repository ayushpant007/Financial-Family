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
import { ChevronRight, CheckCircle2, Plus, Trash2, ArrowRight, UserPlus, Landmark, TrendingDown } from "lucide-react";
import { FundAutocomplete } from "@/components/fund-autocomplete";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { usePageBackground } from "@/hooks/usePageBackground";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Asset Name</Label>
        <FundAutocomplete
          value={data.assetName ?? ""}
          onChange={(v) => onChange({ ...data, assetName: v })}
        />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Investment Method</Label>
        <Select value={data.investmentMethod ?? "Lump sum"} onValueChange={(v) => onChange({ ...data, investmentMethod: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl">
            <SelectItem value="Lump sum" className="text-xs">Lump sum</SelectItem>
            <SelectItem value="SIP" className="text-xs">SIP (Systematic Investment Plan)</SelectItem>
            <SelectItem value="SWP" className="text-xs">SWP (Systematic Withdrawal Plan)</SelectItem>
            <SelectItem value="STP" className="text-xs">STP (Systematic Transfer Plan)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(!data.investmentMethod || data.investmentMethod === "Lump sum") ? (
        <>
          <div className="space-y-1">
            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Transaction Type</Label>
            <Select value={data.transactionType ?? "Buy"} onValueChange={(v) => onChange({ ...data, transactionType: v })}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-slate-200 rounded-xl"><SelectItem value="Buy" className="text-xs">Buy</SelectItem><SelectItem value="Sell" className="text-xs">Sell</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.date ?? ""} onChange={(e) => onChange({ ...data, date: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Units</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.units ?? ""} onChange={(e) => {
            const units = e.target.value;
            const price = data.price ?? "0";
            onChange({ ...data, units, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
          }} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Price per Unit</Label><Input type="number" placeholder="0.00" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.price ?? ""} onChange={(e) => {
            const price = e.target.value;
            const units = data.units ?? "0";
            onChange({ ...data, price, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
          }} /></div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Amount (auto-calculated)</Label>
            <Input readOnly value={data.amount ?? "0.00"} className="bg-slate-100 text-slate-900 font-bold border-slate-200 rounded-xl h-10 text-xs" />
          </div>
        </>
      ) : data.investmentMethod === "SIP" ? (
        <>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Monthly SIP Amount</Label><Input type="number" placeholder="5000" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.monthlyInvestment ?? ""} onChange={(e) => onChange({ ...data, monthlyInvestment: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Expected Return (%)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Duration (years)</Label><Input type="number" placeholder="10" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
        </>
      ) : data.investmentMethod === "SWP" ? (
        <>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Initial Investment</Label><Input type="number" placeholder="1000000" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.investmentAmount ?? ""} onChange={(e) => onChange({ ...data, investmentAmount: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Monthly Withdrawal</Label><Input type="number" placeholder="10000" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.monthlyWithdrawal ?? ""} onChange={(e) => onChange({ ...data, monthlyWithdrawal: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Expected Return (%)</Label><Input type="number" placeholder="8" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Duration (years)</Label><Input type="number" placeholder="10" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
        </>
      ) : (
        <>
          <div className="sm:col-span-2 space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Target Fund Name</Label><Input placeholder="Fund to transfer into..." className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.targetFundName ?? ""} onChange={(e) => onChange({ ...data, targetFundName: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Source Investment</Label><Input type="number" placeholder="500000" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.investmentAmount ?? ""} onChange={(e) => onChange({ ...data, investmentAmount: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Monthly Transfer</Label><Input type="number" placeholder="5000" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.monthlyTransfer ?? ""} onChange={(e) => onChange({ ...data, monthlyTransfer: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Source Return (%)</Label><Input type="number" placeholder="6" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Target Return (%)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.targetInterestRate ?? ""} onChange={(e) => onChange({ ...data, targetInterestRate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Duration (years)</Label><Input type="number" placeholder="5" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 transition-all text-xs" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
        </>
      )}
    </div>
  );
}

function StockForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Asset Name</Label>
        <StockAutocomplete
          value={data.assetName ?? ""}
          onChange={(v) => onChange({ ...data, assetName: v })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Transaction Type</Label>
        <Select value={data.transactionType ?? "Buy"} onValueChange={(v) => onChange({ ...data, transactionType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl"><SelectItem value="Buy" className="text-xs">Buy</SelectItem><SelectItem value="Sell" className="text-xs">Sell</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Date</Label>
        <Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.date ?? ""} onChange={(e) => onChange({ ...data, date: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Units</Label>
        <Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.units ?? ""} onChange={(e) => {
          const units = e.target.value;
          const price = data.price ?? "0";
          onChange({ ...data, units, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
        }} />
      </div>
      <div className="space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Price per Share</Label>
        <Input type="number" placeholder="0.00" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.price ?? ""} onChange={(e) => {
          const price = e.target.value;
          const units = data.units ?? "0";
          onChange({ ...data, price, amount: (parseFloat(units || "0") * parseFloat(price || "0")).toFixed(2) });
        }} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Amount (auto-calculated)</Label>
        <Input readOnly value={data.amount ?? "0.00"} className="bg-slate-100 text-slate-900 font-bold border-slate-200 rounded-xl h-10 text-xs" />
      </div>
    </div>
  );
}

function FDForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2 space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Institution Name</Label><Input placeholder="e.g. SBI Bank" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.institutionName ?? ""} onChange={(e) => onChange({ ...data, institutionName: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Investment Amount</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.investmentAmount ?? ""} onChange={(e) => onChange({ ...data, investmentAmount: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Interest Rate (%)</Label><Input type="number" placeholder="7.5" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Maturity Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.maturityDate ?? ""} onChange={(e) => onChange({ ...data, maturityDate: e.target.value })} /></div>
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Payout Type</Label>
        <Select value={data.payoutType ?? "Cumulative"} onValueChange={(v) => onChange({ ...data, payoutType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl"><SelectItem value="Cumulative" className="text-xs">Cumulative</SelectItem><SelectItem value="Monthly" className="text-xs">Monthly</SelectItem><SelectItem value="Quarterly" className="text-xs">Quarterly</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
  );
}

function RDForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2 space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Institution Name</Label><Input placeholder="e.g. HDFC Bank" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.institutionName ?? ""} onChange={(e) => onChange({ ...data, institutionName: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Monthly Investment</Label><Input type="number" placeholder="5000" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.monthlyInvestment ?? ""} onChange={(e) => onChange({ ...data, monthlyInvestment: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Interest Rate (%)</Label><Input type="number" placeholder="6.5" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Start Date</Label><Input type="date" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.startDate ?? ""} onChange={(e) => onChange({ ...data, startDate: e.target.value })} /></div>
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Tenure (months)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.tenure ?? ""} onChange={(e) => onChange({ ...data, tenure: e.target.value })} /></div>
    </div>
  );
}

function PPFForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Account Type</Label>
        <Select value={data.accountType ?? "PPF"} onValueChange={(v) => onChange({ ...data, accountType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl"><SelectItem value="PPF" className="text-xs">PPF</SelectItem><SelectItem value="EPF" className="text-xs">EPF</SelectItem></SelectContent>
        </Select>
      </div>
      {data.accountType === "EPF" ? (
        <>
          <div className="space-y-1">
            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Your Age</Label>
            <Input 
              type="number" 
              placeholder="e.g. 30" 
              className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs"
              value={data.age ?? ""} 
              onChange={(e) => {
                const age = parseInt(e.target.value) || 0;
                const newData: Record<string, string> = { ...data, age: e.target.value };
                if (age > 0 && age < 60) {
                  newData.tenureYears = String(60 - age);
                }
                onChange(newData);
              }} 
            />
          </div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Basic Salary (monthly)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.basicSalary ?? ""} onChange={(e) => onChange({ ...data, basicSalary: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Dearness Allowance (monthly)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.dearnessAllowance ?? ""} onChange={(e) => onChange({ ...data, dearnessAllowance: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Contribution (%)</Label><Input type="number" placeholder="12" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.employeeContributionPercent ?? ""} onChange={(e) => onChange({ ...data, employeeContributionPercent: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Interest Rate (%)</Label><Input type="number" placeholder="8.15" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Investment Duration (years)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.tenureYears ?? ""} onChange={(e) => onChange({ ...data, tenureYears: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Current EPF Balance (optional)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.currentBalance ?? ""} onChange={(e) => onChange({ ...data, currentBalance: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Annual increase in salary (%) (optional)</Label><Input type="number" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.salaryGrowth ?? ""} onChange={(e) => onChange({ ...data, salaryGrowth: e.target.value })} /></div>
        </>
      ) : (
        <>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Start Year</Label><Input type="number" placeholder="2020" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.startYear ?? ""} onChange={(e) => onChange({ ...data, startYear: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Total Contribution</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.totalContribution ?? ""} onChange={(e) => onChange({ ...data, totalContribution: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Interest Rate (%)</Label><Input type="number" placeholder="8.15" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.interestRate ?? ""} onChange={(e) => onChange({ ...data, interestRate: e.target.value })} /></div>
        </>
      )}
    </div>
  );
}

function CashBankForm({ data, onChange }: { data: Record<string, string>; onChange: (d: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Bank Name</Label><Input placeholder="e.g. ICICI Bank" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.bankName ?? ""} onChange={(e) => onChange({ ...data, bankName: e.target.value })} /></div>
      <div className="space-y-1">
        <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Account Type</Label>
        <Select value={data.accountType ?? "Savings"} onValueChange={(v) => onChange({ ...data, accountType: v })}>
          <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl"><SelectItem value="Savings" className="text-xs">Savings</SelectItem><SelectItem value="Current" className="text-xs">Current</SelectItem><SelectItem value="FD" className="text-xs">Fixed Deposit</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2 space-y-1"><Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Current Balance</Label><Input type="number" placeholder="0" className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs" value={data.currentBalance ?? ""} onChange={(e) => onChange({ ...data, currentBalance: e.target.value })} /></div>
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
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Onboarding Command Header */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-950/20 border border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-slate-800 text-amber-400 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border border-slate-700/50 uppercase">
                <UserPlus className="h-3.5 w-3.5" /> Client Registry
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white mt-1">Client Onboarding Workspace</h1>
              <p className="text-slate-400 text-sm max-w-xl">
                Register a new client profile and pre-configure their initial financial assets, liabilities, and obligations through our structured advisor workflow.
              </p>
            </div>
          </div>
        </div>

        {/* Wizard Progress / Step Indicator */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className={`flex items-center gap-4 flex-1 p-3 rounded-2xl transition-all duration-300 ${step === "account" ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${step === "account" ? "bg-amber-500 text-slate-950" : "bg-emerald-500 text-white"}`}>
              {step === "onboarding" ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </div>
            <div>
              <p className={`text-[9px] uppercase tracking-widest font-extrabold ${step === "account" ? "text-amber-400/80" : "text-emerald-500/80"}`}>Step One</p>
              <p className="text-sm font-black mt-0.5">Account Credentials</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center justify-center px-2">
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </div>
          
          <div className={`flex items-center gap-4 flex-1 p-3 rounded-2xl transition-all duration-300 ${step === "onboarding" ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${step === "onboarding" ? "bg-amber-500 text-slate-950" : "bg-slate-200 text-slate-500"}`}>
              2
            </div>
            <div>
              <p className={`text-[9px] uppercase tracking-widest font-extrabold ${step === "onboarding" ? "text-amber-400/80" : "text-slate-400"}`}>Step Two</p>
              <p className="text-sm font-black mt-0.5">Financial Details</p>
            </div>
          </div>
        </div>

        {step === "account" && (
          <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 p-6 md:p-8">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-slate-400" /> Client Account Details
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                Establish secure system login credentials and primary contact parameters for the client.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleCreateAccount} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Full Name *</Label>
                    <Input 
                      placeholder="e.g. Eleanor Vance" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 focus:bg-white transition-all text-sm" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Email Address</Label>
                    <Input 
                      type="email" 
                      placeholder="eleanor@example.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 focus:bg-white transition-all text-sm" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Phone Number</Label>
                    <Input 
                      placeholder="+91-9876543210" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 focus:bg-white transition-all text-sm" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Username *</Label>
                    <Input 
                      placeholder="eleanor_vance" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      required 
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 focus:bg-white transition-all text-sm" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Password *</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 focus:bg-white transition-all text-sm" 
                    />
                  </div>
                </div>
                
                {createClient.isError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <span>Error establishing client account. The selected username may already be registered.</span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs h-11 rounded-2xl shadow-lg shadow-amber-500/10 cursor-pointer transition-all duration-300 border-none" 
                  disabled={createClient.isPending}
                >
                  {createClient.isPending ? "Creating Client Record..." : "Initialize Client Account"}
                  {!createClient.isPending && <ChevronRight className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "onboarding" && (
          <div className="space-y-6">
            
            {/* Elegant Notification Success Card */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 flex items-start gap-4 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Account created for {clientName}</p>
                <p className="text-xs text-slate-500 mt-0.5">Now configure their financial assets, liabilities, and obligations below. You can also skip this step and fill it in later.</p>
              </div>
            </div>

            {/* Assets Card */}
            <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="h-4.5 w-4.5 text-slate-400" /> Client Assets &amp; Investments
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-1">Pre-configure asset balances, mutual funds, stocks, PPF/EPF, and bank accounts</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addAsset} 
                  className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs h-9 px-4 rounded-xl shadow-sm transition-all flex-shrink-0"
                >
                  <Plus className="h-4 w-4 text-slate-500" /> Add Asset Class
                </Button>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                {assets.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <Landmark className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No assets added yet</p>
                    <p className="text-slate-400 text-xs mt-1">Onboard holdings to begin tracking client net worth.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {assets.map((asset, i) => (
                      <div key={i} className="border border-slate-200/60 rounded-2xl p-5 space-y-4 bg-slate-50/50 shadow-sm relative transition-all hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-black">
                              {i + 1}
                            </span>
                            <Select value={asset.type} onValueChange={(v) => {
                              const updated = [...assets];
                              updated[i] = { type: v, data: {} };
                              setAssets(updated);
                            }}>
                              <SelectTrigger className="w-56 bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm font-bold text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 rounded-xl">
                                {ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs font-semibold text-slate-700">{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeAsset(i)} 
                            className="text-rose-500 hover:bg-rose-50 rounded-xl h-9 w-9"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-200/60">
                          {asset.type === "mutual_fund" && <MutualFundForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                          {asset.type === "stock" && <StockForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                          {asset.type === "fixed_deposit" && <FDForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                          {asset.type === "recurring_deposit" && <RDForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                          {asset.type === "provident_fund" && <PPFForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                          {asset.type === "cash_bank" && <CashBankForm data={asset.data} onChange={(d) => { const a = [...assets]; a[i] = { ...a[i], data: d }; setAssets(a); }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Liabilities Card */}
            <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingDown className="h-4.5 w-4.5 text-slate-400" /> Client Liabilities &amp; Debts
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-1">Pre-configure family loans, home loans, and debt obligations</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addLiability} 
                  className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs h-9 px-4 rounded-xl shadow-sm transition-all flex-shrink-0"
                >
                  <Plus className="h-4 w-4 text-slate-500" /> Add Liability Class
                </Button>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                {liabilities.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <TrendingDown className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No liabilities added yet</p>
                    <p className="text-slate-400 text-xs mt-1">Add client's outstanding obligations to compute debt-to-equity ratios.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {liabilities.map((liability, i) => (
                      <div key={i} className="border border-slate-200/60 rounded-2xl p-5 space-y-4 bg-slate-50/50 shadow-sm relative transition-all hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                              L{i + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">Liability Account Details</span>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeLiability(i)} 
                            className="text-rose-500 hover:bg-rose-50 rounded-xl h-9 w-9"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200/60">
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Loan Type</Label>
                            <Select value={liability.loanType} onValueChange={(v) => { const l = [...liabilities]; l[i] = { ...l[i], loanType: v }; setLiabilities(l); }}>
                              <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm font-bold text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 rounded-xl">{LOAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs font-semibold text-slate-700">{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Lender Name</Label>
                            <Input placeholder="e.g. HDFC Bank" value={liability.lenderName} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], lenderName: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-medium" />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Total Loan Amount</Label>
                            <Input type="number" placeholder="0" value={liability.totalLoanAmount} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], totalLoanAmount: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-medium" />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Outstanding Amount</Label>
                            <Input type="number" placeholder="0" value={liability.outstandingAmount} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], outstandingAmount: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-medium" />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Interest Rate (%)</Label>
                            <Input type="number" placeholder="8.5" value={liability.interestRate} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], interestRate: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-medium" />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">EMI</Label>
                            <Input type="number" placeholder="0" value={liability.emi} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], emi: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-medium" />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Start Date</Label>
                            <Input type="date" value={liability.startDate} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], startDate: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-medium" />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">End Date</Label>
                            <Input type="date" value={liability.endDate} onChange={(e) => { const l = [...liabilities]; l[i] = { ...l[i], endDate: e.target.value }; setLiabilities(l); }} className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 shadow-sm text-xs font-medium" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={handleSkip} 
                className="flex-1 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-extrabold text-xs h-11 rounded-2xl shadow-sm transition-all"
              >
                Skip for now
              </Button>
              <Button 
                onClick={handleFinish} 
                className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs h-11 rounded-2xl shadow-lg shadow-amber-500/10 cursor-pointer transition-all duration-300 border-none" 
                disabled={createAsset.isPending || createLiability.isPending}
              >
                {createAsset.isPending || createLiability.isPending ? "Saving Records..." : "Save & View Client Portfolio"}
                {!createAsset.isPending && !createLiability.isPending && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
