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
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Current NAV</span>
        <span className="font-medium">₹{data.nav.toFixed(4)} <span className="text-muted-foreground font-normal">({data.date})</span></span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Market Value</span>
        <span className="font-semibold text-foreground">{formatCurrency(marketValue)}</span>
      </div>
      {investmentAmount > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Gain / Loss</span>
          <span className={`flex items-center gap-1 font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatCurrency(Math.abs(gain))} ({isPositive ? "+" : "-"}{Math.abs(gainPct).toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  );
}
