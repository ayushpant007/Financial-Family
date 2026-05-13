import { getStockSymbol } from "@/lib/stocks";
import { useStockPrice } from "@/hooks/use-stock-price";
import { formatCurrency } from "@/lib/utils-format";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface StockPriceDisplayProps {
  stockName: string;
  units: number;
  investmentAmount: number;
}

export function StockPriceDisplay({ stockName, units, investmentAmount }: StockPriceDisplayProps) {
  const symbol = getStockSymbol(stockName);
  const { data, isLoading, error } = useStockPrice(symbol);

  if (!symbol) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Fetching live price...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">Live price unavailable</p>
    );
  }

  const marketValue = units * data.price;
  const gain = marketValue - investmentAmount;
  const gainPct = investmentAmount > 0 ? (gain / investmentAmount) * 100 : 0;
  const isPositive = gain >= 0;
  const dayChange = data.previousClose > 0 ? ((data.price - data.previousClose) / data.previousClose) * 100 : null;

  return (
    <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <span className="text-slate-500">Live Price ({symbol})</span>
        <span className="font-medium text-slate-900">
          ₹{data.price.toFixed(2)}
          {dayChange !== null && (
            <span className={`ml-1.5 whitespace-nowrap ${dayChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              ({dayChange >= 0 ? "+" : ""}{dayChange.toFixed(2)}% today)
            </span>
          )}
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
