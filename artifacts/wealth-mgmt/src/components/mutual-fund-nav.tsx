import { getFundCode } from "@/lib/mutual-funds";
import { useMFNav } from "@/hooks/use-mf-nav";
import { formatCurrency } from "@/lib/utils-format";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface MutualFundNavProps {
  fundName: string;
  units: number;
  investmentAmount: number;
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
    </div>
  );
}
