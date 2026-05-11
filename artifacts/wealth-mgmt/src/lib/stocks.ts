import stocksData from "./stocks-data.json";

export type StockOption = {
  symbol: string;
  name: string;
};

export const stockOptions: StockOption[] = stocksData as StockOption[];

export function searchStocks(query: string): StockOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return stockOptions.slice(0, 50);
  return stockOptions
    .filter((s) => `${s.name} ${s.symbol}`.toLowerCase().includes(normalized))
    .slice(0, 50);
}

export function getStockSymbol(name: string): string | null {
  const match = stockOptions.find(
    (s) => s.name.toLowerCase() === name.trim().toLowerCase()
  );
  return match?.symbol ?? null;
}
