import type { StockHolding } from "@/src/types/portfolio";

export const portfolio: StockHolding[] = [
  { id: "sample-hdfc", name: "HDFC Bank", sector: "Financials", exchangeCode: "HDFCBANK", yahooSymbol: "HDFCBANK.NS", purchasePrice: 1500, quantity: 10, referencePrice: 1700.15, peRatio: 18.69, latestEarnings: 91.02 },
  { id: "sample-infosys", name: "Infosys", sector: "Technology", exchangeCode: "INFY", yahooSymbol: "INFY.NS", purchasePrice: 1400, quantity: 12, referencePrice: 1725.3, peRatio: 25.86, latestEarnings: 66.63 },
  { id: "sample-dmart", name: "Avenue Supermarts (DMart)", sector: "Consumer", exchangeCode: "DMART", yahooSymbol: "DMART.NS", purchasePrice: 3200, quantity: 5, referencePrice: 3451.1, peRatio: 82.63, latestEarnings: 41.75 },
  { id: "sample-tata-power", name: "Tata Power", sector: "Power & Renewables", exchangeCode: "TATAPOWER", yahooSymbol: "TATAPOWER.NS", purchasePrice: 300, quantity: 20, referencePrice: 351, peRatio: 29.36, latestEarnings: 11.94 },
  { id: "sample-astral", name: "Astral", sector: "Pipes & Materials", exchangeCode: "ASTRAL", yahooSymbol: "ASTRAL.NS", purchasePrice: 1300, quantity: 8, referencePrice: 1317.6, peRatio: 67.13, latestEarnings: 19.59 },
  { id: "sample-clean", name: "Clean Science & Technology", sector: "Others", exchangeCode: "CLEAN", yahooSymbol: "CLEAN.NS", purchasePrice: 1250, quantity: 8, referencePrice: 1237.45, peRatio: 50.37, latestEarnings: 24.52 },
];
