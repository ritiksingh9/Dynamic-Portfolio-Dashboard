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

export type FundamentalSource = "google-finance" | "workbook" | "unavailable";

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
  peRatioSource: FundamentalSource;
  latestEarningsSource: FundamentalSource;
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
