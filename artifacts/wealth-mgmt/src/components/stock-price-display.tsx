import { useState } from "react";
import { getStockSymbol } from "@/lib/stocks";
import { useStockPrice } from "@/hooks/use-stock-price";
import { formatCurrency } from "@/lib/utils-format";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// ── Stock Projection Dialog (internal) ────────────────────────────────────────

function StockProjectionDialog({
  stockName,
  symbol,
  units,
  investmentAmount,
}: {
  stockName: string;
  symbol: string;
  units: number;
  investmentAmount: number;
}) {
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [futureYears, setFutureYears] = useState(5);
  const { data, isLoading } = useStockPrice(symbol);

  const currentPrice = data?.price ?? 0;
  const currentValue = currentPrice * units;
  const gain = currentValue - investmentAmount;
  const gainPct = investmentAmount > 0 ? (gain / investmentAmount) * 100 : 0;

  const r = Math.pow(1 + expectedReturn / 100, 1 / 12) - 1;
  const now = new Date();

  const futureRows = currentPrice > 0
    ? Array.from({ length: futureYears * 12 }, (_, i) => {
        const month = i + 1;
        const d = new Date(now.getFullYear(), now.getMonth() + month, 1);
        const projPrice = currentPrice * Math.pow(1 + r, month);
        return {
          month,
          dateStr: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
          price: projPrice,
          portfolioValue: projPrice * units,
        };
      })
    : [];

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white border-slate-200">
      <DialogHeader>
        <DialogTitle className="text-slate-900 text-base font-black leading-snug">
          {stockName}
          <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
            Stock Portfolio Projection ({symbol})
          </span>
        </DialogTitle>
      </DialogHeader>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 text-xs pb-3 border-b border-slate-100">
        <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Live Price</p>
          {isLoading
            ? <p className="font-black text-slate-400">Loading…</p>
            : <p className="font-black text-slate-900 tabular-nums">₹{currentPrice.toFixed(2)}</p>}
          <p className="text-[10px] text-slate-400">{units} units</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Current Value</p>
          <p className="font-black text-slate-900 tabular-nums">{formatCurrency(currentValue)}</p>
          <p className="text-[10px] text-slate-400">Invested: {formatCurrency(investmentAmount)}</p>
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

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Future Projection</p>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-500 whitespace-nowrap">Expected Return (%)</label>
          <Input
            type="number"
            className="h-7 w-20 text-xs"
            value={expectedReturn}
            min={0}
            max={100}
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
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching live price…
        </div>
      ) : (
        <ScrollArea className="flex-1 overflow-y-auto pr-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 sticky top-0 bg-white z-10">
                <th className="text-left px-3 py-2 text-slate-400 font-bold text-[11px]">Month</th>
                <th className="text-right px-3 py-2 text-slate-400 font-bold text-[11px]">Est. Price (₹)</th>
                <th className="text-right px-3 py-2 text-slate-400 font-bold text-[11px]">Portfolio Value (₹)</th>
                <th className="text-right px-3 py-2 text-slate-400 font-bold text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Current row */}
              <tr className="border-b border-slate-50 bg-amber-50/70 font-semibold">
                <td className="px-3 py-1.5 text-slate-700">
                  {now.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">₹{currentPrice.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-bold text-slate-900">{formatCurrency(currentValue)}</td>
                <td className="px-3 py-1.5 text-right">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Today
                  </span>
                </td>
              </tr>
              {futureRows.map((row) => (
                <tr key={row.month} className="border-b border-slate-50 bg-emerald-50/30">
                  <td className="px-3 py-1.5 text-emerald-700 font-medium">{row.dateStr} 🔮</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">₹{row.price.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-emerald-700">{formatCurrency(row.portfolioValue)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <span className="text-[10px] text-emerald-400 font-semibold">Projected</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </DialogContent>
  );
}

/** Compact green pill-button trigger for the portfolio summary distribution list */
export function StockProjectionInline({
  stockName,
  units,
  investmentAmount,
}: {
  stockName: string;
  units: number;
  investmentAmount: number;
}) {
  const symbol = getStockSymbol(stockName);
  if (!symbol) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-lg px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 transition-all whitespace-nowrap cursor-pointer">
          📊 Projection
        </button>
      </DialogTrigger>
      <StockProjectionDialog
        stockName={stockName}
        symbol={symbol}
        units={units}
        investmentAmount={investmentAmount}
      />
    </Dialog>
  );
}
