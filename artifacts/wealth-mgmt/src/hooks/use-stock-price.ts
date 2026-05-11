import { useQuery } from "@tanstack/react-query";

export type StockPriceData = {
  symbol: string;
  price: number;
  previousClose: number;
  currency: string;
  exchange: string;
  marketState: string;
};

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useStockPrice(symbol: string | null) {
  return useQuery<StockPriceData>({
    queryKey: ["stock-price", symbol],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/stocks/price/${symbol}`);
      if (!res.ok) throw new Error("Failed to fetch stock price");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
