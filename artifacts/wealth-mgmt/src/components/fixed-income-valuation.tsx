import { formatCurrency } from "@/lib/utils-format";
import { TrendingUp, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export function calculateIncomeTax(income: number, standardDeduction: number = 75000): number {
  const taxableIncome = Math.max(0, income - standardDeduction);
  
  // Rebate 87A: If total income (before deductions) <= 7L, tax is nil in new regime
  if (income <= 700000) return 0;
  if (taxableIncome <= 400000) return 0;

  let grossTax = 0;
  const slabs = [
    { limit: 400000, rate: 0.05 },
    { limit: 800000, rate: 0.10 },
    { limit: 1200000, rate: 0.15 },
    { limit: 1600000, rate: 0.20 },
    { limit: 2000000, rate: 0.25 },
    { limit: 2400000, rate: 0.30 },
  ];

  let remaining = taxableIncome - 400000;
  for (let i = 0; i < slabs.length; i++) {
    const chunk = (i === slabs.length - 1) ? remaining : Math.min(remaining, 400000);
    grossTax += chunk * slabs[i].rate;
    remaining -= chunk;
    if (remaining <= 0) break;
  }

  // Add 4% Cess
  const cess = grossTax * 0.04;
  return grossTax + cess;
}

export function calculateEMI(P: number, r_annual: number, N_months: number, isFlat: boolean = false, subType?: string): number {
  if (P <= 0 || r_annual < 0 || N_months <= 0) return 0;
  
  if (subType === "No Cost EMI") {
    return P / N_months;
  }

  if (isFlat) {
    const T_years = N_months / 12;
    const R_decimal = r_annual / 100;
    const totalInterest = P * R_decimal * T_years;
    return (P + totalInterest) / N_months;
  }

  if (subType === "Working Capital/ OD") {
    // Interest = Used Amount × Rate × Time (Assume 1 month for Monthly Interest)
    const R_monthly = r_annual / 12 / 100;
    return P * R_monthly; // Interest for one month
  }

  if (subType === "Bullet Loan") {
    // Monthly Interest = P × R
    const R_monthly = r_annual / 12 / 100;
    return P * R_monthly;
  }

  const R = r_annual / 12 / 100; // Monthly rate
  const emi = (P * R * Math.pow(1 + R, N_months)) / (Math.pow(1 + R, N_months) - 1);
  return emi;
}

interface ProjectionRow {
  month: number;
  dateStr: string;
  amount: number;
}

function generateFDProjection(P: number, R: number, n_freq: number, startStr: string, maturityStr?: string): ProjectionRow[] {
  const startD = new Date(startStr);
  const endD = maturityStr ? new Date(maturityStr) : new Date(startD.getFullYear() + 2, startD.getMonth());
  
  const totalMonths = (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth());
  if (totalMonths <= 0) return [];
  
  const rows: ProjectionRow[] = [];
  let currentD = new Date(startD);
  
  for (let i = 1; i <= totalMonths; i++) {
    currentD.setMonth(currentD.getMonth() + 1);
    
    const t = i / 12;
    const currentAmount = P * Math.pow(1 + R / n_freq, n_freq * t);
    
    rows.push({
      month: i,
      dateStr: currentD.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      amount: currentAmount
    });
  }
  return rows;
}

function calculateIndianRDValue(M: number, r_percent: number, months: number): number {
  if (months <= 0) return 0;
  // Indian banks compound quarterly, but we calculate an effective monthly rate for RD
  const i_q = r_percent / 400; // Quarterly rate (decimal)
  const i_eff = Math.pow(1 + i_q, 1/3) - 1; // Effective monthly rate
  
  // Future Value of Annuity Due (installments at start of month)
  // Formula: M * [(1+i)^n - 1] / i * (1+i)
  const total = M * (Math.pow(1 + i_eff, months) - 1) / i_eff * (1 + i_eff);
  return total;
}

function generateRDProjection(M: number, R_percent: number, n_freq: number, startStr: string, tenureMonths: number): ProjectionRow[] {
  const startD = new Date(startStr);
  if (tenureMonths <= 0) return [];
  
  const rows: ProjectionRow[] = [];
  
  // Month 0 (Start Date): Just the initial deposit
  rows.push({
    month: 0,
    dateStr: startD.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    amount: M
  });

  for (let i = 1; i <= tenureMonths; i++) {
    const currentD = new Date(startD);
    currentD.setMonth(currentD.getMonth() + i);
    
    // Value at the end of i months
    let amount = calculateIndianRDValue(M, R_percent, i);
    
    // If not yet matured, we assume we just made the installment for the next month
    if (i < tenureMonths) {
      amount += M;
    }
    
    rows.push({
      month: i,
      dateStr: currentD.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      amount: amount
    });
  }
  return rows;
}


export const calculateSIPValue = (P: number, r_annual: number, n_months: number) => {
  if (P <= 0 || r_annual < 0 || n_months <= 0) return 0;
  // Match Groww by using Effective Monthly Rate: (1 + r_annual/100)^(1/12) - 1
  const r = Math.pow(1 + r_annual / 100, 1 / 12) - 1;
  return P * (Math.pow(1 + r, n_months) - 1) / r * (1 + r);
};

export const calculateSWPValue = (P: number, W: number, r_annual: number, n_months: number) => {
  if (P <= 0 || r_annual < 0 || n_months <= 0) return 0;
  const r = Math.pow(1 + r_annual / 100, 1 / 12) - 1;
  // FV = P(1+r)^n - W * [(1+r)^n - 1] / r
  const fv = P * Math.pow(1 + r, n_months) - W * (Math.pow(1 + r, n_months) - 1) / r;
  return Math.max(0, fv);
};

export const calculateSTPTargetValue = (T: number, r_annual: number, n_months: number) => {
  if (T <= 0 || r_annual < 0 || n_months <= 0) return 0;
  const r = Math.pow(1 + r_annual / 100, 1 / 12) - 1;
  // Use Ordinary Annuity formula: T * [(1+r)^n - 1] / r
  return T * (Math.pow(1 + r, n_months) - 1) / r;
};

export const calculateMFCurrentValue = (data: any) => {
  const method = data.investmentMethod;
  const start = data.startDate;
  if (!start) return 0;
  
  const tenureYears = parseFloat(data.tenureYears || "0") || 1;
  const n_passed = monthsElapsed(start, tenureYears * 12);
  const rate = parseFloat(data.interestRate || "0") || 0;

  if (method === "SIP") {
    const P = parseFloat(data.monthlyInvestment || "0") || 0;
    return calculateSIPValue(P, rate, n_passed);
  } else if (method === "SWP") {
    const P = parseFloat(data.investmentAmount || "0") || 0;
    const W = parseFloat(data.monthlyWithdrawal || "0") || 0;
    return calculateSWPValue(P, W, rate, n_passed);
  } else if (method === "STP") {
    const P = parseFloat(data.investmentAmount || "0") || 0;
    const T = parseFloat(data.monthlyTransfer || "0") || 0;
    const rateTarget = parseFloat(data.targetInterestRate || "0") || 0;
    const sourceValue = calculateSWPValue(P, T, rate, n_passed);
    const targetValue = calculateSTPTargetValue(T, rateTarget, n_passed);
    return sourceValue + targetValue;
  }
  return 0;
};

function generateSIPProjection(P: number, r_annual: number, n_months: number, startStr: string): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const startD = new Date(startStr);
  const r = r_annual / 12 / 100;
  for (let i = 1; i <= n_months; i++) {
    const d = new Date(startD);
    d.setMonth(startD.getMonth() + i);
    rows.push({
      month: i,
      dateStr: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      amount: calculateSIPValue(P, r_annual, i)
    });
  }
  return rows;
}

function generateSWPProjection(P: number, W: number, r_annual: number, n_months: number, startStr: string): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const startD = new Date(startStr);
  for (let i = 1; i <= n_months; i++) {
    const d = new Date(startD);
    d.setMonth(startD.getMonth() + i);
    rows.push({
      month: i,
      dateStr: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      amount: calculateSWPValue(P, W, r_annual, i)
    });
  }
  return rows;
}

function generateSTPProjection(P: number, T: number, r_source: number, r_target: number, n_months: number, startStr: string): any[] {
  const rows: any[] = [];
  const startD = new Date(startStr);
  for (let i = 1; i <= n_months; i++) {
    const d = new Date(startD);
    d.setMonth(startD.getMonth() + i);
    const source = calculateSWPValue(P, T, r_source, i);
    const target = calculateSTPTargetValue(T, r_target, i);
    rows.push({
      month: i,
      dateStr: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      source,
      target,
      total: source + target
    });
  }
  return rows;
}

const calculateEPFProjection = (
  monthlyBasic: number,
  monthlyDA: number,
  employeeContributionPercent: number,
  interestRate: number,
  tenureYears: number,
  currentBalance: number = 0,
  annualSalaryGrowth: number = 0,
  startYear: number = new Date().getFullYear()
) => {
  const annualInterestRate = interestRate / 100;
  const monthlyInterestRate = annualInterestRate / 12;
  const growthRate = annualSalaryGrowth / 100;
  
  let balance = currentBalance;
  let currentBasic = monthlyBasic + monthlyDA;
  const projections = [];

  for (let year = 1; year <= tenureYears; year++) {
    const employeeContrib = currentBasic * (employeeContributionPercent / 100);
    // Match Groww: Employer part to EPF corpus is approx 8.8% of (Basic + DA)
    const employerContrib = currentBasic * 0.088;
    const monthlyTotalContrib = employeeContrib + employerContrib;
    
    let yearlyInterest = 0;
    for (let month = 1; month <= 12; month++) {
      yearlyInterest += (balance + month * monthlyTotalContrib) * monthlyInterestRate;
    }
    
    balance += (monthlyTotalContrib * 12) + yearlyInterest;
    
    projections.push({
      month: year,
      dateStr: String(startYear + year - 1),
      amount: Math.round(balance),
      contribution: Math.round(monthlyTotalContrib * 12),
      interest: Math.round(yearlyInterest)
    });
    
    currentBasic *= (1 + growthRate);
  }
  return projections;
};

export function calculatePFCurrentValue(data: Record<string, any>) {
  const rate = parseFloat(String(data.interestRate ?? "8.25")) || 8.25;
  const startDateStr = String(data.startDate ?? data.startYear ?? "");
  const maturityDateStr = String(data.maturityDate ?? "");
  
  let startYear = new Date().getFullYear();
  if (startDateStr) {
    const d = new Date(startDateStr);
    if (!isNaN(d.getTime())) {
      startYear = d.getFullYear();
    } else {
      const num = parseInt(startDateStr);
      if (!isNaN(num)) startYear = num;
    }
  }

  const accountType = String(data.accountType ?? "PPF");
  
  let projectionYears = 15;
  if (data.tenureYears) {
    projectionYears = parseInt(String(data.tenureYears)) || 15;
  } else if (startDateStr && maturityDateStr) {
    const d1 = new Date(startDateStr);
    const d2 = new Date(maturityDateStr);
    const diff = d2.getFullYear() - d1.getFullYear();
    if (diff > 0) projectionYears = diff;
  }

  const T_raw = Math.max(0, new Date().getFullYear() - startYear + 1);
  const T = Math.min(T_raw, projectionYears);
  
  let currentValue = 0;
  let totalInterest = 0;
  let totalInvested = 0;

  if (accountType === "EPF" && data.basicSalary) {
    const basic = parseFloat(String(data.basicSalary)) || 0;
    const da = parseFloat(String(data.dearnessAllowance)) || 0;
    const contribPct = parseFloat(String(data.employeeContributionPercent)) || 12;
    const growth = parseFloat(String(data.salaryGrowth)) || 0;
    const startBalance = parseFloat(String(data.currentBalance)) || 0;

    const projections = calculateEPFProjection(basic, da, contribPct, rate, T, startBalance, growth, startYear);
    const lastRow = projections[projections.length - 1];
    currentValue = lastRow ? lastRow.amount : startBalance;
    
    // Total invested calculation for EPF
    let currentBasic = basic + da;
    for (let y = 1; y <= T; y++) {
      const employeeContrib = currentBasic * (contribPct / 100);
      const epsContrib = Math.min(1250, currentBasic * 0.0833);
      const employerContrib = (currentBasic * 0.12) - epsContrib;
      totalInvested += (employeeContrib + employerContrib) * 12;
      currentBasic *= (1 + growth / 100);
    }
    totalInterest = currentValue - totalInvested - startBalance;
  } else {
    const P = parseFloat(String(data.totalContribution ?? data.monthlyInvestment ?? "0")) || 0;
    const R = rate / 100;
    if (accountType === "EPF") {
      const M = P;
      const i = R / 12;
      const n = T * 12;
      currentValue = i > 0 ? M * (Math.pow(1 + i, n) - 1) / i : M * n;
      totalInvested = M * n;
    } else {
      currentValue = R > 0 ? P * (Math.pow(1 + R, T) - 1) / R * (1 + R) : P * T;
      totalInvested = P * T;
    }
    totalInterest = currentValue - totalInvested;
  }

  return { currentValue, totalInterest, totalInvested, T, startYear, projectionYears, P: parseFloat(String(data.totalContribution ?? "0")), rate, accountType };
}

function generatePFProjection(P: number, R_percent: number, startYear: number, tenureYears: number, accountType: string = "PPF", extraData?: any): ProjectionRow[] {
  if (accountType === "EPF" && extraData && extraData.basicSalary) {
    const basic = parseFloat(extraData.basicSalary) || 0;
    const da = parseFloat(extraData.dearnessAllowance) || 0;
    const contribPct = parseFloat(extraData.employeeContributionPercent) || 12;
    const growth = parseFloat(extraData.salaryGrowth) || 0;
    const startBalance = parseFloat(extraData.currentBalance) || 0;

    return calculateEPFProjection(basic, da, contribPct, R_percent, tenureYears, startBalance, growth, startYear);
  } else {
    const R = R_percent / 100;
    const rows: ProjectionRow[] = [];
    for (let t = 1; t <= tenureYears; t++) {
      let amount = 0;
      if (accountType === "EPF") {
        const M = P; 
        const i = R / 12;
        const n = t * 12;
        amount = i > 0 ? M * (Math.pow(1 + i, n) - 1) / i : M * n;
      } else {
        amount = R > 0 ? P * (Math.pow(1 + R, t) - 1) / R * (1 + R) : P * t;
      }
      rows.push({
        month: t,
        dateStr: String(startYear + t - 1),
        amount: amount
      });
    }
    return rows;
  }
}


interface FDValuationProps {
  data: Record<string, unknown>;
}

export function FDValuation({ data }: FDValuationProps) {
  const principal = Number(data.investmentAmount ?? 0);
  const rate = Number(data.interestRate ?? 0);
  const start = String(data.startDate ?? "");
  const maturity = String(data.maturityDate ?? "");

  if (!principal || !start) return null;

  const P = principal;
  const R = rate / 100;
  const T = yearsElapsed(start, maturity || undefined);
  
  const payoutType = String(data.payoutType ?? "Cumulative");
  let n_freq = 1;
  if (payoutType === "Monthly") n_freq = 12;
  else if (payoutType === "Quarterly") n_freq = 4;
  
  const currentValue = P * Math.pow(1 + R / n_freq, n_freq * T);
  const interest = currentValue - P;
  const isMatured = maturity ? new Date() >= new Date(maturity) : false;

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Principal</span>
        <span className="font-medium">{formatCurrency(principal)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Interest ({rate}% p.a., {payoutType} compounding)
        </span>
        <span className="font-medium text-green-600">+ {formatCurrency(interest)}</span>
      </div>
      <div className="flex flex-col gap-2 border-t pt-2 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
            <span className="truncate">
              {isMatured ? "Maturity Value" : `Current Value (as of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`}
            </span>
          </span>
          <span className="font-bold text-green-700 whitespace-nowrap">{formatCurrency(currentValue)}</span>
        </div>
        
        <div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs w-full sm:w-auto">
                <Calculator className="h-3 w-3 mr-2" /> View Projection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>FD Growth Projection</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generateFDProjection(P, R, n_freq, start, maturity).map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell>{row.dateStr}</TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          {formatCurrency(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export function RDValuation({ data }: FDValuationProps) {
  const monthly = Number(data.monthlyInvestment ?? 0);
  const rate = Number(data.interestRate ?? 0);
  const start = String(data.startDate ?? "");
  const maturity = String(data.maturityDate ?? "");

  if (!monthly) return null;

  let tenureMonths = 0;
  if (start && maturity) {
    const d1 = new Date(start);
    const d2 = new Date(maturity);
    tenureMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  } else {
    tenureMonths = Number(data.tenure ?? 0);
  }

  const M = monthly;
  const n_months_passed = start ? monthsElapsed(start, tenureMonths || undefined) : tenureMonths;
  const n_installments = Math.min(n_months_passed + 1, tenureMonths);
  
  const accruedOnPassed = calculateIndianRDValue(M, rate, n_months_passed);
  const currentInstallment = (n_installments > n_months_passed) ? M : 0;
  const currentValue = accruedOnPassed + currentInstallment;
  
  const totalInvested = M * n_installments;
  const interest = currentValue - totalInvested;
  const isComplete = start ? monthsElapsed(start) >= tenureMonths : false;

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Invested ({n_installments} of {tenureMonths} months)
        </span>
        <span className="font-medium">{formatCurrency(totalInvested)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Interest ({rate}% p.a., Quarterly comp.)</span>
        <span className="font-medium text-green-600">+ {formatCurrency(interest)}</span>
      </div>
      <div className="flex flex-col gap-2 border-t pt-2 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
            <span className="truncate">
              {isComplete ? "Maturity Value" : `Current Value (as of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`}
            </span>
          </span>
          <span className="font-bold text-green-700 whitespace-nowrap">{formatCurrency(currentValue)}</span>
        </div>
        
        {start && tenureMonths > 0 && (
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs w-full sm:w-auto">
                  <Calculator className="h-3 w-3 mr-2" /> View Projection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>RD Growth Projection</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generateRDProjection(M, rate, 4, start, tenureMonths).map((row) => (
                        <TableRow key={row.month}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell>{row.dateStr}</TableCell>
                          <TableCell className="text-right font-medium text-green-700">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

export function PFValuation({ data }: { data: any }) {
  const { currentValue, totalInterest, T, startYear, projectionYears, P, rate, accountType } = calculatePFCurrentValue(data);
  const maturityDateStr = String(data.maturityDate ?? "");

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
      {accountType === "EPF" && data.basicSalary ? (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly Salary (Basic+DA)</span>
            <span className="font-medium">{formatCurrency((parseFloat(String(data.basicSalary)) || 0) + (parseFloat(String(data.dearnessAllowance)) || 0))}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Contribution ({String(data.employeeContributionPercent)}%)</span>
            <span className="font-medium">EPF Corpus</span>
          </div>
          {data.age && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">Your Age</span>
              <span className="font-medium">{data.age} Yr</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{accountType === "EPF" ? "Monthly" : "Annual"} Contribution</span>
            <span className="font-medium">{formatCurrency(P)}</span>
          </div>
          {data.age && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">Your Age</span>
              <span className="font-medium">{data.age} Yr</span>
            </div>
          )}
        </>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Interest ({rate}% p.a. × {T} yrs)
        </span>
        <span className="font-medium text-green-600">+ {formatCurrency(totalInterest)}</span>
      </div>
      {maturityDateStr && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground italic">
          <span>Maturity Date: {new Date(maturityDateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      )}
      <div className="flex flex-col gap-2 border-t pt-2 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
            <span className="truncate">Current Value</span>
          </span>
          <span className="font-bold text-green-700 whitespace-nowrap">{formatCurrency(currentValue)}</span>
        </div>
        
        {(P > 0 || (accountType === "EPF" && parseFloat(String(data.basicSalary)) > 0)) && (
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs w-full sm:w-auto">
                  <Calculator className="h-3 w-3 mr-2" /> View Projection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>PF Growth Projection</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Financial Year</TableHead>
                        <TableHead className="text-right">Balance (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatePFProjection(P, rate, startYear, projectionYears, accountType, data).map((row) => (
                        <TableRow key={row.month} className={row.dateStr === String(new Date().getFullYear()) ? "bg-muted/50" : ""}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell>{row.dateStr}-{Number(row.dateStr)+1}</TableCell>
                          <TableCell className="text-right font-medium text-green-700">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoanValuation({ liability }: { liability: any }) {
  const P = parseFloat(String(liability.totalLoanAmount)) || 0;
  const outstanding = parseFloat(String(liability.outstandingAmount)) || 0;
  const rate = parseFloat(String(liability.interestRate)) || 0;
  const emi = parseFloat(String(liability.emi)) || 0;
  const start = liability.startDate ? new Date(liability.startDate) : null;
  const end = liability.endDate ? new Date(liability.endDate) : null;

  if (P <= 0) return null;

  let tenureMonths = 0;
  if (start && end) {
    tenureMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  const paidAmount = P - outstanding;
  const progressPercent = Math.min(100, Math.max(0, (paidAmount / P) * 100));

  const generateLoanProjection = () => {
    if (P <= 0 || rate <= 0 || tenureMonths <= 0) return [];
    const rows = [];
    let balance = P;
    const R = rate / 12 / 100;
    const notes = liability.notes ?? "";
    const isFlat = notes.includes("|Flat");
    const subType = notes.split("|").pop();
    const mEMI = calculateEMI(P, rate, tenureMonths, isFlat, subType);
    
    for (let i = 1; i <= tenureMonths; i++) {
      let interest = 0;
      let principal = 0;

      if (subType === "Working Capital/ OD" || subType === "Bullet Loan") {
        interest = mEMI;
        principal = 0; // Balance doesn't reduce in these interest-only models
      } else if (isFlat) {
        interest = (P * (rate / 100) * (tenureMonths / 12)) / tenureMonths;
        principal = P / tenureMonths;
        balance = Math.max(0, balance - principal);
      } else if (subType === "No Cost EMI") {
        // Effective Cost = Product Price - Discount Lost
        interest = balance * R;
        principal = mEMI - interest; 
        balance = Math.max(0, balance - principal);
      } else {
        interest = balance * R;
        principal = mEMI - interest;
        balance = Math.max(0, balance - principal);
      }
      
      const rowDate = new Date(start!);
      rowDate.setMonth(start!.getMonth() + i);

      rows.push({
        month: i,
        dateStr: rowDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        interest,
        principal,
        balance
      });
      if (balance <= 0 && !(subType === "Working Capital/ OD" || subType === "Bullet Loan")) break;
    }
    return rows;
  };

  const projection = generateLoanProjection();
  const totalInterestPayable = projection.reduce((sum, row) => sum + row.interest, 0);
  const totalRepaymentAmount = P + totalInterestPayable;

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Repayment Progress</span>
        <span className="font-bold text-primary">{progressPercent.toFixed(1)}%</span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div 
          className="bg-primary h-full transition-all duration-500" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Principal Paid:</span>
          <span className="text-foreground font-medium">{formatCurrency(paidAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Remaining:</span>
          <span className="text-red-600 font-bold">{formatCurrency(outstanding)}</span>
        </div>
        
        <div className="flex justify-between border-t pt-1 mt-1">
          <span className="text-muted-foreground">Total Interest:</span>
          <span className="text-amber-600 font-medium">{formatCurrency(totalInterestPayable)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 mt-1">
          <span className="text-muted-foreground">Total Amount:</span>
          <span className="text-foreground font-bold">{formatCurrency(totalRepaymentAmount)}</span>
        </div>

        {emi > 0 && (
          <div className="flex justify-between col-span-2 border-t pt-1 mt-1 italic text-muted-foreground">
            <span>EMI: {formatCurrency(emi)}/mo</span>
            {tenureMonths > 0 && <span>Tenure: {tenureMonths} months</span>}
          </div>
        )}
      </div>

      {tenureMonths > 0 && (
        <div className="pt-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-[10px] w-full">
                <Calculator className="h-3 w-3 mr-1" /> View Repayment Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Loan Repayment Schedule</DialogTitle>
                <div className="grid grid-cols-3 gap-4 pt-2 border-b pb-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Principal Amount</p>
                    <p className="text-sm font-bold">{formatCurrency(P)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Interest</p>
                    <p className="text-sm font-bold text-amber-600">{formatCurrency(totalInterestPayable)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(totalRepaymentAmount)}</p>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs">Principal Component</TableHead>
                      <TableHead className="text-xs">Interest Component</TableHead>
                      <TableHead className="text-right text-xs">Remaining Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projection.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="text-xs py-2">{row.dateStr}</TableCell>
                        <TableCell className="text-xs py-2 text-green-700 font-medium">{formatCurrency(row.principal)}</TableCell>
                        <TableCell className="text-xs py-2 text-red-600">{formatCurrency(row.interest)}</TableCell>
                        <TableCell className="text-right text-xs py-2 font-bold">{formatCurrency(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

export function SIPValuation({ data }: { data: any }) {
  const P = parseFloat(String(data.monthlyInvestment ?? "0")) || 0;
  const rate = parseFloat(String(data.interestRate ?? "0")) || 0;
  const start = String(data.startDate ?? "");
  const tenureYears = parseFloat(String(data.tenureYears ?? "1")) || 1;
  const totalMonths = tenureYears * 12;

  if (P <= 0 || !start) return null;

  const n_passed = monthsElapsed(start, totalMonths);
  const currentValue = calculateSIPValue(P, rate, n_passed);
  const totalInvested = P * n_passed;
  const gains = currentValue - totalInvested;

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Monthly SIP</span>
        <span className="font-medium">{formatCurrency(P)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total Invested</span>
        <span className="font-medium">{formatCurrency(totalInvested)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Estimated Gains ({rate}% p.a.)</span>
        <span className="font-medium text-green-600">+ {formatCurrency(gains)}</span>
      </div>
      <div className="flex flex-col gap-2 border-t pt-2 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
            <span className="truncate">Current Value</span>
          </span>
          <span className="font-bold text-green-700 whitespace-nowrap">{formatCurrency(currentValue)}</span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs w-full sm:w-auto">
              <Calculator className="h-3 w-3 mr-2" /> View Projection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>SIP Growth Projection</DialogTitle></DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Month</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Value (₹)</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {generateSIPProjection(P, rate, totalMonths, start).map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell><TableCell>{row.dateStr}</TableCell>
                      <TableCell className="text-right font-medium text-green-700">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function SWPValuation({ data }: { data: any }) {
  const P = parseFloat(String(data.investmentAmount ?? "0")) || 0;
  const W = parseFloat(String(data.monthlyWithdrawal ?? "0")) || 0;
  const rate = parseFloat(String(data.interestRate ?? "0")) || 0;
  const start = String(data.startDate ?? "");
  const tenureYears = parseFloat(String(data.tenureYears ?? "1")) || 1;
  const totalMonths = tenureYears * 12;

  if (P <= 0 || !start) return null;

  const n_passed = monthsElapsed(start, totalMonths);
  const currentValue = calculateSWPValue(P, W, rate, n_passed);
  const totalWithdrawn = W * n_passed;

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Initial Investment</span>
        <span className="font-medium">{formatCurrency(P)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Monthly Withdrawal</span>
        <span className="font-medium text-red-600">- {formatCurrency(W)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total Withdrawn</span>
        <span className="font-medium">{formatCurrency(totalWithdrawn)}</span>
      </div>
      <div className="flex flex-col gap-2 border-t pt-2 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
            <span className="truncate">Remaining Balance ({rate}% p.a.)</span>
          </span>
          <span className="font-bold text-green-700 whitespace-nowrap">{formatCurrency(currentValue)}</span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs w-full sm:w-auto">
              <Calculator className="h-3 w-3 mr-2" /> View Projection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>SWP Balance Projection</DialogTitle></DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Month</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Balance (₹)</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {generateSWPProjection(P, W, rate, totalMonths, start).map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell><TableCell>{row.dateStr}</TableCell>
                      <TableCell className="text-right font-medium text-green-700">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function STPValuation({ data }: { data: any }) {
  const P = parseFloat(String(data.investmentAmount ?? "0")) || 0;
  const T = parseFloat(String(data.monthlyTransfer ?? "0")) || 0;
  const rateSource = parseFloat(String(data.interestRate ?? "0")) || 0;
  const rateTarget = parseFloat(String(data.targetInterestRate ?? "0")) || 0;
  const start = String(data.startDate ?? "");
  const tenureYears = parseFloat(String(data.tenureYears ?? "1")) || 1;
  const totalMonths = tenureYears * 12;

  if (P <= 0 || !start) return null;

  const n_passed = monthsElapsed(start, totalMonths);
  const sourceValue = calculateSWPValue(P, T, rateSource, n_passed);
  const targetValue = calculateSTPTargetValue(T, rateTarget, n_passed);

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Monthly Transfer</span>
        <span className="font-medium">{formatCurrency(T)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Source Balance ({rateSource}%)</span>
        <span className="font-medium">{formatCurrency(sourceValue)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Target Balance ({rateTarget}%)</span>
        <span className="font-medium text-green-600">{formatCurrency(targetValue)}</span>
      </div>
      <div className="flex flex-col gap-2 border-t pt-2 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
            <span className="truncate">Total Combined Value</span>
          </span>
          <span className="font-bold text-green-700 whitespace-nowrap">{formatCurrency(sourceValue + targetValue)}</span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs w-full sm:w-auto">
              <Calculator className="h-3 w-3 mr-2" /> View Projection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>STP Transfer Projection</DialogTitle></DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Source (₹)</TableHead>
                    <TableHead className="text-right">Target (₹)</TableHead>
                    <TableHead className="text-right font-bold">Total (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generateSTPProjection(P, T, rateSource, rateTarget, totalMonths, start).map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell>{row.dateStr}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(row.source)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(row.target)}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
