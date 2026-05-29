import { useState } from "react";
import { getFundCode } from "@/lib/mutual-funds";
import { useMFNav, useMFNavFull } from "@/hooks/use-mf-nav";
import { formatCurrency } from "@/lib/utils-format";
import { TrendingUp, TrendingDown, Loader2, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface MutualFundNavProps {
  fundName: string;
  units: number;
  investmentAmount: number;
}

/** Parse DD-MM-YYYY → Date */
function parseAmfiDate(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/** Deduplicate to one entry per month (keep the latest entry in each month) */
function deduplicateByMonth(history: { date: string; nav: number }[]) {
  // history is newest-first from AMFI
  const seen = new Set<string>();
  const result: { date: string; nav: number; isoMonth: string }[] = [];
  for (const row of history) {
    const d = parseAmfiDate(row.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...row, isoMonth: key });
    }
  }
  return result; // still newest-first
}

/** Project forward from currentNAV using expected annual return */
function generateFutureProjection(
  currentNAV: number,
  units: number,
  annualReturnPct: number,
  futureMonths: number,
  afterDate: Date
): { month: number; dateStr: string; nav: number; portfolioValue: number; isFuture: true }[] {
  const r = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
  const rows = [];
  for (let i = 1; i <= futureMonths; i++) {
    const d = new Date(afterDate.getFullYear(), afterDate.getMonth() + i, 1);
    const projNav = currentNAV * Math.pow(1 + r, i);
    rows.push({
      month: i,
      dateStr: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      nav: projNav,
      portfolioValue: projNav * units,
      isFuture: true as const,
    });
  }
  return rows;
}

function MFProjectionDialog({
  fundName,
  units,
  investmentAmount,
  schemeCode,
}: {
  fundName: string;
  units: number;
  investmentAmount: number;
  schemeCode: string;
}) {
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [futureYears, setFutureYears] = useState(5);
  const { data, isLoading } = useMFNavFull(schemeCode);

  const historicalRows = data ? deduplicateByMonth(data.history).reverse() : []; // oldest→newest
  const latestNAV = data?.nav ?? 0;
  const latestDate = data ? parseAmfiDate(data.date) : new Date();
  const futureRows = latestNAV > 0
    ? generateFutureProjection(latestNAV, units, expectedReturn, futureYears * 12, latestDate)
    : [];

  const currentPortfolioValue = latestNAV * units;
  const gain = currentPortfolioValue - investmentAmount;
  const gainPct = investmentAmount > 0 ? (gain / investmentAmount) * 100 : 0;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white border-slate-200">
      <DialogHeader>
        <DialogTitle className="text-slate-900 text-base font-black leading-snug">
          {fundName}
          <span className="block text-[11px] font-normal text-slate-400 mt-0.5">NAV History &amp; Portfolio Projection</span>
        </DialogTitle>
      </DialogHeader>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3 text-xs pb-3 border-b border-slate-100">
        <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Latest NAV</p>
          <p className="font-black text-slate-900 tabular-nums">₹{latestNAV.toFixed(4)}</p>
          <p className="text-[10px] text-slate-400">{data?.date ?? ""}</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Current Value</p>
          <p className="font-black text-slate-900 tabular-nums">{formatCurrency(currentPortfolioValue)}</p>
          <p className="text-[10px] text-slate-400">{units} units</p>
        </div>
        <div className={`rounded-xl px-3 py-2 border ${gain >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Gain / Loss</p>
          <p className={`font-black tabular-nums text-sm ${gain >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {gain >= 0 ? "+" : ""}{formatCurrency(gain)}
          </p>
          <p className={`text-[10px] font-semibold ${gain >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {gain >= 0 ? "+" : ""}{gainPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Future projection controls */}
      <div className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Future Projection</p>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-500 whitespace-nowrap">Expected Return (%)</label>
          <Input
            type="number"
            className="h-7 w-20 text-xs"
            value={expectedReturn}
            min={0}
            max={50}
            step={0.5}
            onChange={(e) => setExpectedReturn(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-500 whitespace-nowrap">Years Ahead</label>
          <Input
            type="number"
            className="h-7 w-16 text-xs"
            value={futureYears}
            min={1}
            max={30}
            step={1}
            onChange={(e) => setFutureYears(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading full NAV history…
        </div>
      ) : (
        <ScrollArea className="flex-1 overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 sticky top-0 bg-white z-10">
                <TableHead className="text-slate-500 text-[11px]">Month</TableHead>
                <TableHead className="text-right text-slate-500 text-[11px]">NAV (₹)</TableHead>
                <TableHead className="text-right text-slate-500 text-[11px]">Portfolio Value (₹)</TableHead>
                <TableHead className="text-right text-slate-500 text-[11px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Historical rows */}
              {historicalRows.map((row, idx) => {
                const portfolioVal = row.nav * units;
                const isLatest = idx === historicalRows.length - 1;
                return (
                  <TableRow
                    key={row.isoMonth}
                    className={`border-slate-50 ${isLatest ? "bg-amber-50/70 font-semibold" : ""}`}
                  >
                    <TableCell className="text-slate-600 text-[12px]">
                      {parseAmfiDate(row.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right text-[12px] tabular-nums text-slate-700">
                      ₹{row.nav.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right text-[12px] tabular-nums font-medium text-slate-800">
                      {formatCurrency(portfolioVal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isLatest ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Today
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">Historical</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Divider row */}
              {futureRows.length > 0 && (
                <TableRow className="bg-slate-900/5">
                  <TableCell colSpan={4} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">
                    ↓ Future Projection @ {expectedReturn}% p.a. ↓
                  </TableCell>
                </TableRow>
              )}

              {/* Future projection rows */}
              {futureRows.map((row) => (
                <TableRow key={`future-${row.month}`} className="border-slate-50 bg-emerald-50/30">
                  <TableCell className="text-emerald-700 text-[12px] font-medium">{row.dateStr}</TableCell>
                  <TableCell className="text-right text-[12px] tabular-nums text-emerald-600">
                    ₹{row.nav.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right text-[12px] tabular-nums font-semibold text-emerald-700">
                    {formatCurrency(row.portfolioValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[10px] text-emerald-400 font-semibold">Projected</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </DialogContent>
  );
}

export function MutualFundNav({ fundName, units, investmentAmount }: MutualFundNavProps) {
  const schemeCode = getFundCode(fundName);
  const { data, isLoading, error } = useMFNav(schemeCode);

  if (!schemeCode) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Fetching live NAV...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">NAV unavailable</p>
    );
  }

  const marketValue = units * data.nav;
  const gain = marketValue - investmentAmount;
  const gainPct = investmentAmount > 0 ? (gain / investmentAmount) * 100 : 0;
  const isPositive = gain >= 0;

  return (
    <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <span className="text-slate-500">Current NAV</span>
        <span className="font-medium text-slate-900">
          ₹{data.nav.toFixed(4)} 
          <span className="text-slate-400 font-normal ml-1.5 whitespace-nowrap">({data.date})</span>
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Market Value</span>
        <span className="font-semibold text-slate-900">{formatCurrency(marketValue)}</span>
      </div>
      {investmentAmount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="text-slate-500">Gain / Loss</span>
          <span className={`flex items-center gap-1 font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatCurrency(Math.abs(gain))} <span className="ml-0.5">({isPositive ? "+" : "-"}{Math.abs(gainPct).toFixed(2)}%)</span>
          </span>
        </div>
      )}
      {/* View Projection button */}
      <div className="pt-1">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs w-full sm:w-auto bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
              <Calculator className="h-3 w-3 mr-2" /> View Projection
            </Button>
          </DialogTrigger>
          <MFProjectionDialog
            fundName={fundName}
            units={units}
            investmentAmount={investmentAmount}
            schemeCode={schemeCode}
          />
        </Dialog>
      </div>
    </div>
  );
}

/** Compact inline projection trigger for use in the portfolio summary distribution list */
export function MFProjectionInline({
  fundName,
  units,
  investmentAmount,
  investmentMethod,
  assetData,
}: {
  fundName: string;
  units: number;
  investmentAmount: number;
  investmentMethod?: string;
  assetData: any;
}) {
  // For SIP / SWP / STP — these components already have their own "View Projection" dialog inside
  // We just render the valuation component which contains the trigger
  if (investmentMethod && investmentMethod !== "Lump sum") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="text-[10px] font-bold text-amber-600 hover:text-amber-800 border border-amber-200 rounded-lg px-2 py-0.5 bg-amber-50 hover:bg-amber-100 transition-all whitespace-nowrap cursor-pointer">
            📊 Projection
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-sm font-black">
              {fundName}
              <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                {investmentMethod} — Evaluation &amp; Projection
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {investmentMethod === "SIP" && (
              <SIPValuationStandalone data={assetData} />
            )}
            {investmentMethod === "SWP" && (
              <SWPValuationStandalone data={assetData} />
            )}
            {investmentMethod === "STP" && (
              <STPValuationStandalone data={assetData} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // For Lump Sum — open the full NAV history + projection dialog
  const schemeCode = getFundCode(fundName);
  if (!schemeCode) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-[10px] font-bold text-amber-600 hover:text-amber-800 border border-amber-200 rounded-lg px-2 py-0.5 bg-amber-50 hover:bg-amber-100 transition-all whitespace-nowrap cursor-pointer">
          📊 Projection
        </button>
      </DialogTrigger>
      <MFProjectionDialog
        fundName={fundName}
        units={units}
        investmentAmount={investmentAmount}
        schemeCode={schemeCode}
      />
    </Dialog>
  );
}

// ── Standalone inline versions for SIP/SWP/STP (no wrapper div, used inside Dialog) ──

function SIPValuationStandalone({ data }: { data: any }) {
  const { formatCurrency: fc } = { formatCurrency };
  const P = parseFloat(String(data.monthlyInvestment ?? "0")) || 0;
  const rate = parseFloat(String(data.interestRate ?? "0")) || 0;
  const start = String(data.startDate ?? "");
  const tenureYears = parseFloat(String(data.tenureYears ?? "1")) || 1;
  const totalMonths = tenureYears * 12;

  if (P <= 0 || !start) return <p className="text-slate-400 text-xs">Insufficient data</p>;

  const r = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const n_passed = (() => {
    const s = new Date(start);
    const now = new Date();
    const m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
    return Math.max(0, Math.min(m, totalMonths));
  })();

  const currentValue = P * (Math.pow(1 + r, n_passed) - 1) / r * (1 + r);
  const totalInvested = P * n_passed;
  const gains = currentValue - totalInvested;

  const rows: { month: number; dateStr: string; value: number }[] = [];
  const startD = new Date(start);
  for (let i = 1; i <= totalMonths; i++) {
    const d = new Date(startD);
    d.setMonth(startD.getMonth() + i);
    const val = P * (Math.pow(1 + r, i) - 1) / r * (1 + r);
    rows.push({ month: i, dateStr: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), value: val });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Monthly SIP</p>
          <p className="font-black text-slate-900">{formatCurrency(P)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Invested</p>
          <p className="font-black text-slate-900">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100 text-center">
          <p className="text-[9px] text-emerald-600 uppercase font-bold mb-0.5">Current Value</p>
          <p className="font-black text-emerald-700">{formatCurrency(currentValue)}</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Month-by-Month SIP Projection ({rate}% p.a.)</p>
      <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr><th className="text-left px-3 py-2 text-slate-400 font-bold text-[10px]">Month</th><th className="text-left px-3 py-2 text-slate-400 font-bold text-[10px]">Date</th><th className="text-right px-3 py-2 text-slate-400 font-bold text-[10px]">Value (₹)</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month} className={`border-t border-slate-50 ${row.month === n_passed ? "bg-amber-50" : ""}`}>
                <td className="px-3 py-1.5 text-slate-500">{row.month}</td>
                <td className="px-3 py-1.5 text-slate-500">{row.dateStr}{row.month > n_passed ? " 🔮" : ""}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">{formatCurrency(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SWPValuationStandalone({ data }: { data: any }) {
  const P = parseFloat(String(data.investmentAmount ?? "0")) || 0;
  const W = parseFloat(String(data.monthlyWithdrawal ?? "0")) || 0;
  const rate = parseFloat(String(data.interestRate ?? "0")) || 0;
  const start = String(data.startDate ?? "");
  const tenureYears = parseFloat(String(data.tenureYears ?? "1")) || 1;
  const totalMonths = tenureYears * 12;

  if (P <= 0 || !start) return <p className="text-slate-400 text-xs">Insufficient data</p>;

  const r = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const n_passed = (() => {
    const s = new Date(start);
    const now = new Date();
    const m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
    return Math.max(0, Math.min(m, totalMonths));
  })();

  const balanceAt = (n: number) => {
    const fv = P * Math.pow(1 + r, n) - W * (Math.pow(1 + r, n) - 1) / r;
    return Math.max(0, fv);
  };

  const currentBalance = balanceAt(n_passed);
  const rows: { month: number; dateStr: string; balance: number }[] = [];
  const startD = new Date(start);
  for (let i = 1; i <= totalMonths; i++) {
    const d = new Date(startD);
    d.setMonth(startD.getMonth() + i);
    rows.push({ month: i, dateStr: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), balance: balanceAt(i) });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Initial</p>
          <p className="font-black text-slate-900">{formatCurrency(P)}</p>
        </div>
        <div className="bg-rose-50 rounded-xl p-2 border border-rose-100 text-center">
          <p className="text-[9px] text-rose-400 uppercase font-bold mb-0.5">Monthly W/D</p>
          <p className="font-black text-rose-600">- {formatCurrency(W)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100 text-center">
          <p className="text-[9px] text-emerald-600 uppercase font-bold mb-0.5">Balance Now</p>
          <p className="font-black text-emerald-700">{formatCurrency(currentBalance)}</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">SWP Balance Projection ({rate}% p.a.)</p>
      <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr><th className="text-left px-3 py-2 text-slate-400 font-bold text-[10px]">Month</th><th className="text-left px-3 py-2 text-slate-400 font-bold text-[10px]">Date</th><th className="text-right px-3 py-2 text-slate-400 font-bold text-[10px]">Balance (₹)</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month} className={`border-t border-slate-50 ${row.month === n_passed ? "bg-amber-50" : ""}`}>
                <td className="px-3 py-1.5 text-slate-500">{row.month}</td>
                <td className="px-3 py-1.5 text-slate-500">{row.dateStr}{row.month > n_passed ? " 🔮" : ""}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">{formatCurrency(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function STPValuationStandalone({ data }: { data: any }) {
  const P = parseFloat(String(data.investmentAmount ?? "0")) || 0;
  const T = parseFloat(String(data.monthlyTransfer ?? "0")) || 0;
  const rateSource = parseFloat(String(data.interestRate ?? "0")) || 0;
  const rateTarget = parseFloat(String(data.targetInterestRate ?? "0")) || 0;
  const start = String(data.startDate ?? "");
  const tenureYears = parseFloat(String(data.tenureYears ?? "1")) || 1;
  const totalMonths = tenureYears * 12;

  if (P <= 0 || !start) return <p className="text-slate-400 text-xs">Insufficient data</p>;

  const rS = Math.pow(1 + rateSource / 100, 1 / 12) - 1;
  const rT = Math.pow(1 + rateTarget / 100, 1 / 12) - 1;
  const n_passed = (() => {
    const s = new Date(start);
    const now = new Date();
    const m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
    return Math.max(0, Math.min(m, totalMonths));
  })();

  const sourceAt = (n: number) => Math.max(0, P * Math.pow(1 + rS, n) - T * (Math.pow(1 + rS, n) - 1) / rS);
  const targetAt = (n: number) => rT > 0 ? T * (Math.pow(1 + rT, n) - 1) / rT : T * n;

  const rows = Array.from({ length: totalMonths }, (_, i) => {
    const n = i + 1;
    const d = new Date(new Date(start));
    d.setMonth(d.getMonth() + n);
    return { month: n, dateStr: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), source: sourceAt(n), target: targetAt(n), total: sourceAt(n) + targetAt(n) };
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Source Now</p>
          <p className="font-black text-slate-900">{formatCurrency(sourceAt(n_passed))}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100 text-center">
          <p className="text-[9px] text-emerald-600 uppercase font-bold mb-0.5">Target Now</p>
          <p className="font-black text-emerald-700">{formatCurrency(targetAt(n_passed))}</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">STP Transfer Projection</p>
      <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="text-left px-2 py-2 text-slate-400 font-bold text-[10px]">Month</th>
              <th className="text-right px-2 py-2 text-slate-400 font-bold text-[10px]">Source (₹)</th>
              <th className="text-right px-2 py-2 text-slate-400 font-bold text-[10px]">Target (₹)</th>
              <th className="text-right px-2 py-2 text-slate-400 font-bold text-[10px]">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month} className={`border-t border-slate-50 ${row.month === n_passed ? "bg-amber-50" : ""}`}>
                <td className="px-2 py-1.5 text-slate-500">{row.dateStr}{row.month > n_passed ? " 🔮" : ""}</td>
                <td className="px-2 py-1.5 text-right text-slate-500">{formatCurrency(row.source)}</td>
                <td className="px-2 py-1.5 text-right text-emerald-600">{formatCurrency(row.target)}</td>
                <td className="px-2 py-1.5 text-right font-bold text-emerald-700">{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
