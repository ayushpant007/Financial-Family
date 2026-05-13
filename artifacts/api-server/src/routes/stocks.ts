import { Router, type Request, type Response } from "express";

const router = Router();

router.get("/stocks/price/:symbol", async (req: Request, res: Response) => {
  const { symbol } = req.params;
  if (!symbol || !/^[A-Z0-9&\-\.]+$/.test(symbol.toUpperCase())) {
    res.status(400).json({ error: "Invalid symbol" });
    return;
  }

  const ticker = `${symbol.toUpperCase()}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

  try {
    const response = (await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })) as any;

    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch stock price" });
      return;
    }

    const json: any = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      res.status(404).json({ error: "Stock not found" });
      return;
    }

    const meta = result.meta;
    res.json({
      symbol: symbol.toUpperCase(),
      ticker,
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose ?? meta.previousClose,
      currency: meta.currency,
      exchange: meta.exchangeName,
      marketState: meta.marketState,
    });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch stock price" });
  }
});

export default router;
