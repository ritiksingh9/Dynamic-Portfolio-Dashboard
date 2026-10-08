export type StockHolding = {
  id: string;
  name: string;
  sector: string;
  exchangeCode: string;
  yahooSymbol: string;
  purchasePrice: number;
  quantity: number;
  referencePrice: number;
  peRatio: number | null;
  latestEarnings: number | null;
};

export type PortfolioHolding = StockHolding & {
  cmp: number;
  presentValue: number;
  investment: number;
  gainLoss: number;
  gainLossPercent: number;
  portfolioPercent: number;
  previousClose: number | null;
  dayChangePercent: number | null;
  priceSource: "yahoo" | "reference";
};

export type PortfolioResponse = {
  holdings: PortfolioHolding[];
  totals: {
    investment: number;
    presentValue: number;
    gainLoss: number;
    gainLossPercent: number;
  };
  updatedAt: string;
  refreshIntervalMs: number;
  datasetSource: "private" | "demo";
  warnings: string[];
};
